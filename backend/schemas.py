from pydantic import BaseModel, HttpUrl, Field, ConfigDict
from datetime import datetime


# Data received when registering an API

from pydantic import BaseModel, HttpUrl, Field, ConfigDict, field_validator
from datetime import datetime
from ipaddress import ip_address
from urllib.parse import urlparse


class MonitorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    url: HttpUrl
    method: str = "GET"
    interval_seconds: int = Field(default=60, ge=60, le=3600)
    timeout_seconds: int = Field(default=10, ge=2, le=30)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value):
        parsed = urlparse(str(value))
        hostname = parsed.hostname

        if parsed.scheme not in ("http", "https"):
            raise ValueError("Only HTTP and HTTPS URLs are allowed")

        if not hostname:
            raise ValueError("Invalid URL hostname")

        if hostname.lower() in ("localhost", "localhost.localdomain"):
            raise ValueError("Localhost URLs are not allowed")

        try:
            address = ip_address(hostname)

            if not address.is_global:
                raise ValueError("Private or reserved IP addresses are not allowed")

        except ValueError as error:
            if "not allowed" in str(error):
                raise

        return value



# Data returned by FastAPI
class MonitorResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    url: str
    method: str
    interval_seconds: int
    timeout_seconds: int
    is_active: bool
    created_at: datetime