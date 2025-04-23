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
yaml = str(namespace_inject(kustomize('./_dev-env'), tilt_namespace))

for key in os.environ.keys():
    needle = "#{" + key + "}#"
    if yaml.find(needle) > -1:
        print("- found '" + needle + "' in YAML; replacing with host env var '" + key + "'.")
    yaml = yaml.replace(needle, os.environ[key])

k8s_yaml(blob(yaml))

# ------------------------------
# helm charts

# ------------------------------

k8s_resource('localdev-frontdoor', port_forwards=[os.environ['FRONTDOOR_PORT'] + ":80"], labels=["svc"])
k8s_resource('localdev-redis', port_forwards=[os.environ['REDIS__PORT'] + ":6379"], labels=["98-svc"])
k8s_resource('localdev-temporal',
    port_forwards=[
        os.environ['TEMPORAL__PORT'] + ":7233", 
        os.environ['TEMPORAL__UI_PORT'] + ":8233"
    ],
    links=[
        link("http://localhost:" + os.environ['TEMPORAL__UI_PORT'], "Temporal UI")
    ],
    labels=["98-svc"])
k8s_resource('localdev-mailpit',
    port_forwards=[
        os.environ['MAILPIT_PORT'] + ':8025', 
        os.environ['EMAIL_DELIVERY__SMTP__PORT'] + ":1025"
    ], 
    links=[
        link("http://localhost:" + os.environ['MAILPIT_PORT'], "Mailpit UI")
    ],
    labels=["98-svc"])
k8s_resource('localdev-postgres', port_forwards=[os.environ['POSTGRES__READWRITE__PORT'] + ":5432"], labels=["98-svc"])
k8s_resource('localdev-minio',
    port_forwards=[
        os.environ['MINIO_PORT'] + ":9000", 
        os.environ['MINIO_UI_PORT'] + ":9001"
    ],
    links=[
        link("http://localhost:" + os.environ['MINIO_UI_PORT'], "Minio Console")
    ],
    labels=["98-svc"])
k8s_resource('localdev-keycloak',
    port_forwards=[os.environ['KEYCLOAK_PORT'] + ":8080"],
    links=[
        link("http://localhost:" + os.environ['KEYCLOAK_PORT'], "Keycloak UI")
    ],
    labels=["98-svc"])


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

local_resource("wait-for-keycloak",
    allow_parallel=True,
    cmd="bash ./_dev-env/scripts/wait-for-keycloak.bash",
    resource_deps=["localdev-keycloak"],
    labels=["99-meta"])

# local_resource("ensure-minio",
#     allow_parallel=True,
#     cmd="bash ./_dev-env/scripts/ensure-minio.bash",
#     resource_deps=["localdev-minio"],
#     labels=["99-meta"])

local_resource("wait-for-dependencies",
    cmd="echo 'Dependencies OK'",
    resource_deps=[
        "wait-for-postgres",
        "wait-for-temporal",
        "wait-for-redis",
        "wait-for-keycloak",
        # "ensure-minio",
    ],
    labels=["99-meta"])

if tilt_runmode == 'dev-in-tilt':
    site_dir = "./apps/site"
    studio_port = os.environ['DRIZZLE_STUDIO_PORT']


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
        serve_dir=site_dir,
        serve_cmd="bash ../../_dev-env/scripts/kill-pg-studio.bash && pnpm run:dev pnpm drizzle-kit studio --port " + studio_port,
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
        dir=site_dir,
        cmd="pnpm cli:dev db migrate && pnpm cli:dev seed apply",
        resource_deps=["wait-for-dependencies"],
        labels=["03-cmd"])
    
    local_resource(
        "cms",
        allow_parallel=True,
        serve_dir="./apps/cms",
        serve_cmd="pnpm dev",
        resource_deps=["wait-for-dependencies"],
        labels=["00-app"]
    )

    local_resource("site",
        serve_dir=site_dir,
        serve_cmd="pnpm dev",
        allow_parallel=True,
        resource_deps=["migrate-postgres", "cms"],
        links=[
            link(os.environ['BASE_URL'], "Site Home"),
            link("http://local.drizzle.studio:" + studio_port, "Drizzle Studio"),
            link("http://localhost:" + os.environ['MAILPIT_PORT'], "Mailpit UI"),
            link("http://localhost:" + os.environ['KEYCLOAK_PORT'], "Keycloak UI"),
            link("http://localhost:" + os.environ['TEMPORAL__UI_PORT'], "Temporal UI")
        ],
        labels=["00-app"])
