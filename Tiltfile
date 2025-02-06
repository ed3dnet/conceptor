tilt_runmode = os.environ['TILT_RUNMODE']
tilt_port_prefix = os.environ['TILT_PORT_PREFIX']
tilt_namespace = os.environ['TILT_NAMESPACE']
node_env = os.environ['NODE_ENV']

allow_k8s_contexts("orbstack")
allow_k8s_contexts("rancher-desktop")

load('ext://helm_resource', 'helm_resource', 'helm_repo')
load('ext://namespace', 'namespace_create', 'namespace_inject')

# Docker builds
# temporal builder
docker_build('localdev-dev/temporal-dev',
             context='./_dev-env/k8s/temporal',
             dockerfile='./_dev-env/k8s/temporal/Dockerfile')

# Base Setup (Kustomize resources)

namespace_create(tilt_namespace)
k8s_yaml(kustomize('./_dev-env'))

# ------------------------------
# helm charts

# ------------------------------

front_door_port = tilt_port_prefix + '00'

# k8s_resource('localdev-frontdoor', port_forwards=[front_door_port + ":80"], labels=["svc"])
k8s_resource('localdev-redis', port_forwards=[tilt_port_prefix + '10:6379'], labels=["98-svc"])
k8s_resource('localdev-temporal', port_forwards=[tilt_port_prefix + '30:7233', tilt_port_prefix + '31:8233'], labels=["98-svc"])
k8s_resource('localdev-mailpit', port_forwards=[tilt_port_prefix + '26:8025', tilt_port_prefix + '25:1025'], labels=["98-svc"])
k8s_resource('localdev-postgres', port_forwards=[tilt_port_prefix + '20:5432'], labels=["98-svc"])
k8s_resource('localdev-minio', port_forwards=[tilt_port_prefix + '40:9000', tilt_port_prefix + '41:9001'], labels=["98-svc"])

# ------------------------------

local_resource("wait-for-postgres",
    allow_parallel=True,
    cmd="bash ./_dev-env/scripts/wait-for-postgres.bash",
    resource_deps=["localdev-postgres"],
    labels=["99-meta"])

local_resource("wait-for-temporal",
    allow_parallel=True,
    cmd="bash ./_dev-env/scripts/wait-for-temporal.bash",
    resource_deps=["localdev-temporal"],
    labels=["99-meta"])

local_resource("wait-for-redis",
    allow_parallel=True,
    cmd="bash ./_dev-env/scripts/wait-for-redis.bash",
    resource_deps=["localdev-redis"],
    labels=["99-meta"])

local_resource("ensure-minio",
    allow_parallel=True,
    cmd="bash ./_dev-env/scripts/ensure-minio.bash",
    resource_deps=["localdev-minio"],
    labels=["99-meta"])

local_resource("wait-for-dependencies",
    cmd="echo 'Dependencies OK'",
    resource_deps=[
        "wait-for-postgres",
        "wait-for-temporal",
        "wait-for-redis",
        "ensure-minio",
    ],
    labels=["99-meta"])

if tilt_runmode == 'dev-in-tilt':
    central_dir = "./apps/central"
    studio_port = tilt_port_prefix + '21'


    worker_core_count = os.environ['TILT_WORKER_CORE_COUNT']
    worker_media_count = os.environ['TILT_WORKER_MEDIA_COUNT']

    # local_resource("cloudflared",
    #     allow_parallel=True,
    #     auto_init=True,
    #     serve_cmd="bash ./_dev-env/cloudflared/run.bash",
    #     deps=["./_dev-env/cloudflared/config.yaml"],
    #     labels=["04-util"])

    local_resource("postgres-studio",
        allow_parallel=True,
        auto_init=True,
        serve_dir=central_dir,
        serve_cmd="pnpm run:dev pnpm drizzle-kit studio --port " + studio_port,
        resource_deps=["wait-for-postgres"],
        labels=["04-util"])

    local_resource("reset-postgres",
        allow_parallel=True,
        auto_init=False,
        cmd="bash ./_dev-env/scripts/reset-postgres.bash",
        resource_deps=["wait-for-postgres"],
        labels=["03-cmd"])

    local_resource("migrate-postgres",
        allow_parallel=True,
        dir="./apps/central",
        cmd="pnpm cli:dev db migrate && pnpm cli:dev seed apply",
        resource_deps=["wait-for-dependencies"],
        labels=["03-cmd"])

    central_file_deps = [
        "./apps/central/src",
        "./apps/central/package.json",
        "./apps/central/tsconfig.json",
    ]

    local_resource("api",
        serve_cmd="pnpm cli:dev api start --migrations no",
        serve_dir=central_dir,
        allow_parallel=True,
        deps=central_file_deps,
        links=[
            link(os.environ["CENTRAL_URLS__API_BASE_URL"] + "/docs", "OpenAPI Browser"),
            link("https://local.drizzle.studio?port=" + studio_port, "Drizzle Studio")
        ],
        resource_deps=["migrate-postgres"],
        labels=["00-app"])


    for i in range(int(worker_core_count)):
        local_resource("worker-core-" + str(i),
            serve_cmd="pnpm cli:dev worker start core",
            serve_dir=central_dir,
            allow_parallel=True,
            deps=central_file_deps,
            resource_deps=["wait-for-dependencies", "migrate-postgres"],
            labels=["01-worker"])

    for i in range(int(worker_media_count)):
        local_resource("worker-media-" + str(i),
            serve_cmd="pnpm cli:dev worker start media",
            serve_dir=central_dir,
            allow_parallel=True,
            deps=central_file_deps,
            resource_deps=["wait-for-dependencies", "migrate-postgres"],
            labels=["01-worker"])

    local_resource("units",
        cmd="pnpm test",
        dir=central_dir,
        allow_parallel=True,
        labels=["02-test"])

    local_resource("api-client",
        allow_parallel=True,
        resource_deps=["api"],
        deps=["./apps/central/src"],
        cmd="bash ./_dev-env/scripts/build-central-client.bash",
        labels=["00-app"])

    # local_resource("tenant-site",
    #     serve_dir="./apps/site-tenant",
    #     serve_cmd="pnpm dev",
    #     allow_parallel=True,
    #     resource_deps=["api", "api-client"],
    #     links=[
    #         "http://hosted.lvh.me:" + front_door_port,
    #         "http://localtest.me:" + front_door_port,
    #     ],
    #     labels=["00-app"])

    local_resource("frontend-site",
        serve_dir="./apps/frontend",
        serve_cmd="pnpm dev",
        allow_parallel=True,
        resource_deps=["api", "api-client"],
        links=[
            os.environ["FRONTEND_BASE_URL"],
        ],
        labels=["00-app"])