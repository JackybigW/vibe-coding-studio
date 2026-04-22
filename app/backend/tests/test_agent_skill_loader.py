import pytest
from pathlib import Path
from services.agent_skill_loader import AgentSkillLoader


def test_agent_skill_loader_lists_skill_metadata():
    loader = AgentSkillLoader()
    listing = loader.describe_available()
    assert "web_sdk" in listing
    assert "custom_api" in listing


def test_agent_skill_loader_returns_full_markdown():
    loader = AgentSkillLoader()
    content = loader.load("web_sdk")
    assert "Frontend authorization" in content


def test_agent_skill_loader_returns_none_for_unknown_skill():
    loader = AgentSkillLoader()
    assert loader.load("nonexistent_skill_xyz") is None


def test_agent_skill_loader_lists_all_known_skills():
    loader = AgentSkillLoader()
    listing = loader.describe_available()
    assert len(listing) >= 4
    assert "object_storage" in listing
    assert "ai_capability" in listing


def test_agent_skill_loader_accepts_custom_skills_dir(tmp_path):
    skill_file = tmp_path / "my_skill.md"
    skill_file.write_text("# My Skill\n\n## Description\nDoes something useful.\n\nFull content here.", encoding="utf-8")
    loader = AgentSkillLoader(skills_dirs=[tmp_path])
    listing = loader.describe_available()
    assert "my_skill" in listing
    assert "Does something useful" in listing["my_skill"]
    content = loader.load("my_skill")
    assert "Full content here" in content
