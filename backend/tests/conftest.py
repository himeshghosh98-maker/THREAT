import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.main import create_app
from scripts.seed import seed


@pytest.fixture
def client(tmp_path):
    settings = Settings(database_url=f"sqlite:///{tmp_path}/db.sqlite",
                        cors_origins="http://localhost:3000, https://ui.example")
    app = create_app(settings)
    with TestClient(app) as client:
        with Session(app.state.engine) as db:
            seed(db)
            seed(db)
        yield client
