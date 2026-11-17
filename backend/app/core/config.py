from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")
    database_url: str = "sqlite:///./casepilot.db"
    demo_mode: bool = True
    operator_token: str = Field(min_length=16)
    frontend_origin: str = "http://localhost:3000"
    llm_model: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    deepseek_api_key: str = ""
    salesforce_mode: Literal["demo", "live"] = "demo"
    salesforce_instance_url: str = ""
    salesforce_client_id: str = ""
    salesforce_client_secret: str = ""
    salesforce_api_version: str = "v64.0"
    salesforce_external_id_field: str = "CasePilot_Reference__c"
    salesforce_status_map: dict[str, str] = {}
    salesforce_priority_map: dict[str, str] = {}
    salesforce_owner_map: dict[str, str] = {}
    salesforce_origin: str = "Web"

    @model_validator(mode="after")
    def enforce_mode(self):
        if not self.demo_mode and self.database_url.startswith("sqlite"):
            raise ValueError("PostgreSQL is required outside demo mode")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
