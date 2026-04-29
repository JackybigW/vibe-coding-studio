class _SandboxClient:
    def __init__(self):
        self.sandbox = None

    async def cleanup(self):
        return None

    async def create(self, config=None):
        self.sandbox = object()
        return self.sandbox

    async def read_file(self, path: str) -> str:
        raise RuntimeError("Sandbox file operations are not enabled in Vibe Coding Studio.")

    async def write_file(self, path: str, content: str) -> None:
        raise RuntimeError("Sandbox file operations are not enabled in Vibe Coding Studio.")

    async def run_command(self, cmd: str, timeout: int | None = None) -> str:
        raise RuntimeError("Sandbox command execution is not enabled in Vibe Coding Studio.")


SANDBOX_CLIENT = _SandboxClient()
