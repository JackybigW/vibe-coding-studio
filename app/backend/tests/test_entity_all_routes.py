from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers import credit_usage, messages, project_files, projects, user_profiles
from core.database import get_db


def test_generated_all_entity_routes_are_not_exposed():
    async def fake_get_db():
        yield object()

    app = FastAPI()
    for router_module in (projects, project_files, messages, credit_usage, user_profiles):
        app.include_router(router_module.router)
    app.dependency_overrides[get_db] = fake_get_db

    all_paths = (
        "/api/v1/entities/projects/all",
        "/api/v1/entities/project_files/all",
        "/api/v1/entities/messages/all",
        "/api/v1/entities/credit_usage/all",
        "/api/v1/entities/user_profiles/all",
    )
    registered_paths = {getattr(route, "path", None) for route in app.routes}
    for path in all_paths:
        assert path not in registered_paths

    with TestClient(app) as client:
        for path in all_paths:
            response = client.get(path)
            assert response.status_code != 200
