import re
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import quote, urlparse

import httpx

from app.core.config import Settings


class SalesforceError(Exception):
    def __init__(self, code: str, retryable: bool = False):
        self.code = code
        self.retryable = retryable
        super().__init__(code)


@dataclass(frozen=True)
class SyncResult:
    case_id: str | None
    live: bool


class SalesforcePort(Protocol):
    def upsert(self, reference: str, snapshot: dict) -> SyncResult: ...


class DemoSalesforce:
    def upsert(self, reference, snapshot):
        return SyncResult(case_id=None, live=False)


class LiveSalesforce:
    """Server-side OAuth client credentials, one token refresh, unique external-ID upsert."""

    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        self.settings = settings
        url = urlparse(settings.salesforce_instance_url)
        if (
            url.scheme != "https"
            or not url.hostname
            or not url.hostname.endswith((".salesforce.com", ".force.com"))
            or url.username
            or url.password
            or url.query
            or url.fragment
            or url.path not in ("", "/")
        ):
            raise SalesforceError("SALESFORCE_CONFIG_INVALID")
        if not settings.salesforce_client_id or not settings.salesforce_client_secret:
            raise SalesforceError("SALESFORCE_CREDENTIALS_MISSING")
        if not re.fullmatch(r"v\d+\.0", settings.salesforce_api_version) or not re.fullmatch(
            r"[A-Za-z][A-Za-z0-9_]*__c", settings.salesforce_external_id_field
        ):
            raise SalesforceError("SALESFORCE_CONFIG_INVALID")
        self.base = settings.salesforce_instance_url.rstrip("/")
        self.client = client or httpx.Client(timeout=10, follow_redirects=False)
        self.token = None

    def close(self):
        self.client.close()

    def authenticate(self):
        try:
            response = self.client.post(
                self.base + "/services/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.settings.salesforce_client_id,
                    "client_secret": self.settings.salesforce_client_secret,
                },
            )
            self.check(response)
            self.token = response.json()["access_token"]
        except (KeyError, ValueError) as exc:
            raise SalesforceError("SALESFORCE_AUTH_INVALID") from exc

    @staticmethod
    def check(response):
        if response.status_code == 429:
            raise SalesforceError("SALESFORCE_RATE_LIMIT", True)
        if response.status_code >= 500:
            raise SalesforceError("SALESFORCE_UNAVAILABLE", True)
        if response.status_code >= 400:
            raise SalesforceError(f"SALESFORCE_HTTP_{response.status_code}")

    def request(self, method, path, **kwargs):
        try:
            if not self.token:
                self.authenticate()
            response = self.client.request(
                method,
                self.base + path,
                headers={"Authorization": f"Bearer {self.token}"},
                **kwargs,
            )
            if response.status_code == 401:
                self.authenticate()
                response = self.client.request(
                    method,
                    self.base + path,
                    headers={"Authorization": f"Bearer {self.token}"},
                    **kwargs,
                )
            self.check(response)
            return response
        except httpx.TransportError as exc:
            raise SalesforceError("SALESFORCE_UNAVAILABLE", True) from exc

    def describe(self):
        prefix = f"/services/data/{self.settings.salesforce_api_version}"
        return self.request("GET", prefix + "/sobjects/Case/describe").json()

    def upsert(self, reference, snapshot):
        settings = self.settings
        status = settings.salesforce_status_map.get(snapshot["status"])
        priority = settings.salesforce_priority_map.get(snapshot["priority"])
        if not status or not priority:
            raise SalesforceError("SALESFORCE_MAPPING_MISSING")
        payload = {
            "Subject": snapshot["subject"],
            "Description": snapshot["description"],
            "Origin": settings.salesforce_origin,
            "Status": status,
            "Priority": priority,
        }
        if snapshot.get("team_id"):
            owner = settings.salesforce_owner_map.get(snapshot["team_id"])
            if not owner or not re.fullmatch(r"[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?", owner):
                raise SalesforceError("SALESFORCE_OWNER_MAPPING_MISSING")
            payload["OwnerId"] = owner
        path = f"/services/data/{settings.salesforce_api_version}/sobjects/Case/{settings.salesforce_external_id_field}/{quote(reference, safe='')}"
        response = self.request("PATCH", path, json=payload)
        if response.status_code == 201:
            case_id = response.json().get("id")
        else:
            case_id = self.request("GET", path).json().get("Id")
        if not case_id or not re.fullmatch(r"[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?", case_id):
            raise SalesforceError("SALESFORCE_RESPONSE_INVALID")
        return SyncResult(case_id=case_id, live=True)


def adapter(settings: Settings) -> SalesforcePort:
    return LiveSalesforce(settings) if settings.salesforce_mode == "live" else DemoSalesforce()
