import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

bearer = HTTPBearer(auto_error=False)


def operator(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not credentials or not secrets.compare_digest(
        credentials.credentials, get_settings().operator_token
    ):
        raise HTTPException(
            401, "Operator authentication required", headers={"WWW-Authenticate": "Bearer"}
        )
    return "operator"
