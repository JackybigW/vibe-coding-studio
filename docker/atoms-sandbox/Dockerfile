# Base image for atoms per-project sandboxes.
# Contract:
#   - Workspace is bind-mounted at /workspace
#   - Container receives ATOMS_PROJECT_ID env var (set at `docker run -e` time)
#   - `start-dev` is on PATH and launches the project's dev server on :3000
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        procps \
        python3 \
        python3-pip \
        python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    cp /root/.local/bin/uv /usr/local/bin/uv && \
    cp /root/.local/bin/uvx /usr/local/bin/uvx

# Pre-install common backend packages into system Python so agents can
# import them without a fresh download on every verification run.
# (Build uses default pypi.org; the mirror ENV below applies at runtime only.)
RUN uv pip install --system --break-system-packages \
    fastapi \
    "uvicorn[standard]" \
    pydantic \
    httpx \
    python-multipart \
    sqlalchemy \
    aiofiles

# Use Tsinghua PyPI mirror at runtime so agent pip installs are fast from China.
# This ENV is set AFTER the RUN above so the image build itself uses pypi.org.
ENV UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

COPY start-dev /usr/local/bin/start-dev
COPY start-preview /usr/local/bin/start-preview
RUN chmod +x /usr/local/bin/start-dev /usr/local/bin/start-preview

WORKDIR /workspace

CMD ["sleep", "infinity"]
