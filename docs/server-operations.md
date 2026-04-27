# Server Operations

Production server:

- Host: `129.211.217.58`
- Project path: `/home/ubuntu/atoms`
- Main branch: `main`

## Network Proxy

Use Clash as the only server-side outbound proxy.

- Service: `clash.service`
- Binary: `/usr/local/bin/clash`
- Config directory: `/etc/clash`
- Config file: `/etc/clash/config.yaml`
- Mixed proxy port: `7890`
- Clash API: `127.0.0.1:9090`
- Subscription URL: `https://yfssce.net/s/9c38abc412c5746f79b5ce98db6d6758`

The subscription currently returns a base64 node list, not raw Clash YAML.
Generate `/etc/clash/config.yaml` from that subscription before restarting
Clash. Keep the `Auto` url-test group enabled so the server can choose a
working node automatically.

Do not run `xray` or `v2ray` alongside Clash on this server. They were removed
to avoid competing proxy ports and unstable Docker/Git outbound behavior.

## Docker Proxy

Docker daemon pulls should go through Clash:

```ini
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:7890"
Environment="HTTPS_PROXY=http://127.0.0.1:7890"
Environment="NO_PROXY=localhost,127.0.0.1"
```

The active drop-in is:

```text
/etc/systemd/system/docker.service.d/http-proxy.conf
```

Avoid registry mirrors unless they have been verified. A stale mirror can fail
before Docker falls back to the next source.

## Git Proxy

For one-off GitHub operations from the server, prefer explicit proxy variables:

```bash
cd /home/ubuntu/atoms
http_proxy=http://127.0.0.1:7890 \
https_proxy=http://127.0.0.1:7890 \
git fetch origin main
```

This avoids relying on global Git proxy state.

## Sandbox Image

After changes under `docker/atoms-sandbox`, rebuild the runtime image on the
server:

```bash
cd /home/ubuntu/atoms
DOCKER_BUILDKIT=1 docker build --network=host \
  --build-arg http_proxy=http://127.0.0.1:7890 \
  --build-arg https_proxy=http://127.0.0.1:7890 \
  --build-arg HTTP_PROXY=http://127.0.0.1:7890 \
  --build-arg HTTPS_PROXY=http://127.0.0.1:7890 \
  -t atoms-sandbox:latest docker/atoms-sandbox
```

