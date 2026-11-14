
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import get_session
from sqlmodel import Session, create_engine, SQLModel, StaticPool
from backend.app.models.tables import User

# Setup test DB
engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
SQLModel.metadata.create_all(engine)

def get_session_override():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = get_session_override
client = TestClient(app)

def test_mentor_chat():
    # Need a user first
    with Session(engine) as session:
        user = User(id=1, name="Test User", goal_role="software_engineer", weekly_hours=20)
        session.add(user)
        session.commit()
    
    response = client.post("/mentor/1", json={"message": "hello"})
    assert response.status_code == 200
    print("Chat test passed")

if __name__ == "__main__":
    test_mentor_chat()
