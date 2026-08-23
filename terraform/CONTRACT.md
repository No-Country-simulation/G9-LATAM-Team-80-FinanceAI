# CONTRATO DE INFRA — FinanceAI / OCI

Fuente unica de verdad. Todo agente lee esto y NO explora el repo.
Los nombres de `variable` y `output` estan CONGELADOS: son la interfaz entre modulos.

## 0. Valores verificados de la tenancy (2026-08-23)

| Clave | Valor |
|---|---|
| Tenancy | `hackaton80` |
| Region (= home region) | `sa-bogota-1` |
| Region key (OCIR) | `bog` -> registry `bog.ocir.io` |
| Namespace Object Storage | `axqvu1tysl6x` |
| Compartment | `financeai` |
| Availability Domain (unico) | `BOJl:SA-BOGOTA-1-AD-1` |
| Shapes ARM disponibles | `VM.Standard.A1.Flex`, `BM.Standard.A1.160` |
| Shape MySQL Always Free | `MySQL.Free` (1 OCPU / 8 GB / 50 GiB fijos) |
| Bucket de estado TF | `financeai_tfstate` (GUION BAJO, versionado ON) |
| Bucket frontend | `financeai-frontend` (lo crea Terraform) |

Bogota tiene **un solo AD** -> no hay failover de AD si A1 se queda sin capacidad.

## 1. Arquitectura

```
Internet --HTTPS--> Caddy (VM A1, TLS automatico via <ip-con-guiones>.sslip.io)
                      |-- /api/*  -> backend:8080      (Spring Boot 4.1, Java 17)
                      |-- /ml/*   -> ml-service:8000   (FastAPI)
                      +-- /*      -> reverse_proxy al bucket financeai-frontend

                    VM --3306--> MySQL HeatWave (subred privada)
```

Un solo origen => sin CORS, sin mixed content, URL raiz limpia.
`VITE_API_URL=/api` (relativo). El frontend NO usa react-router: no hace falta SPA fallback.

## 2. Layout (propiedad exclusiva por stage — no tocar fuera de lo tuyo)

```
terraform/
├── CONTRACT.md                 (este archivo, solo lectura)
├── modules/network/            -> stage: network
├── modules/compute/            -> stage: compute
├── modules/database/           -> stage: database
├── modules/storage/            -> stage: storage
└── envs/prod/                  -> stage: tf-root  (incl. cloud-init/, plantillas)
```

Cada modulo = exactamente `main.tf`, `variables.tf`, `outputs.tf`.
Las plantillas cloud-init / docker-compose / Caddyfile viven en `envs/prod/cloud-init/`,
NO en `modules/compute/`.

## 3. Interfaces congeladas

### modules/network

```
IN : compartment_ocid, tenancy_ocid, vcn_cidr="10.0.0.0/16",
     public_subnet_cidr="10.0.1.0/24", private_subnet_cidr="10.0.2.0/24",
     ssh_ingress_cidr, name_prefix, freeform_tags
OUT: vcn_id, public_subnet_id, private_subnet_id, app_nsg_id, db_nsg_id,
     availability_domain, availability_domains
```

- `oci_core_vcn` usa `cidr_blocks` (lista). `cidr_block` esta DEPRECADO.
- NSG rules: `protocol="6"` (TCP) o `"all"`; puertos en
  `tcp_options { destination_port_range { min, max } }`.
- app NSG: INGRESS 22 desde `var.ssh_ingress_cidr`; 80 y 443 desde `0.0.0.0/0`; EGRESS all.
- db NSG : INGRESS 3306 con `source_type="NETWORK_SECURITY_GROUP"`, `source=<app_nsg_id>`.

### modules/compute

```
IN : compartment_ocid, availability_domain, public_subnet_id, app_nsg_id, ssh_public_key,
     cloud_init (string ya renderizado), instance_ocpus=2, instance_memory_gb=12,
     boot_volume_gb=50, name_prefix
OUT: instance_id, instance_private_ip, public_ip, public_ip_dashed, app_hostname
```

- `shape="VM.Standard.A1.Flex"`, `shape_config { ocpus=2, memory_in_gbs=12 }`.
  NO subir: Oracle empezo a terminar instancias sobre-cuota el 2026-08-18.
- Imagen: `data "oci_core_images"` con `operating_system="Canonical Ubuntu"`,
  `operating_system_version="24.04"`, `shape="VM.Standard.A1.Flex"`,
  `sort_by="TIMECREATED"`, `sort_order="DESC"`.
- `create_vnic_details.assign_public_ip = false` (OBLIGATORIO) + `oci_core_public_ip`
  con `lifetime="RESERVED"` sobre el private IP (via `data "oci_core_private_ips"`).
- `metadata = { ssh_authorized_keys, user_data = base64encode(var.cloud_init) }`. Cap 32 KB.
- `app_hostname = "${replace(public_ip, ".", "-")}.sslip.io"`

### modules/database

```
IN : compartment_ocid, availability_domain, subnet_id (privada), db_nsg_id,
     db_admin_username, db_admin_password (sensitive), name_prefix
OUT: db_system_id, db_private_ip, db_port, db_hostname, db_admin_username
```

- `oci_mysql_mysql_db_system` con `shape_name="MySQL.Free"`, `is_highly_available=false`.
- NO poner `data_storage_size_in_gb` (50 GiB son fijos).
  NO poner bloque `backup_policy` custom.
- `deletion_policy { is_delete_protected=false, final_backup="SKIP_FINAL_BACKUP",
  automatic_backup_retention="DELETE" }`
- La password NUNCA sale por output y NUNCA se genera con `random_password`.
- Tarda 10-20 min en llegar a ACTIVE.

### modules/storage

```
IN : tenancy_ocid, compartment_ocid, bucket_name="financeai-frontend",
     ocir_region_key="bog", name_prefix
OUT: namespace, bucket_name, bucket_base_url, ocir_endpoint,
     backend_image_repo, ml_image_repo
```

- Bucket: `access_type="ObjectReadWithoutList"`.
- `oci_artifacts_container_repository` x2, `display_name` en minusculas:
  `"financeai/backend"`, `"financeai/ml-service"`.
- `ocir_endpoint = "bog.ocir.io"`
- imagenes = `bog.ocir.io/axqvu1tysl6x/financeai/{backend,ml-service}`

### envs/prod (stage tf-root)

- provider `oracle/oci ~> 7.0`, autenticacion por `private_key` (contenido PEM), no por path.
- backend "s3" exacto (YA PROBADO CONTRA LA TENANCY, funciona):

```hcl
backend "s3" {
  bucket    = "financeai_tfstate"
  key       = "prod/terraform.tfstate"
  region    = "sa-bogota-1"
  endpoints = { s3 = "https://axqvu1tysl6x.compat.objectstorage.sa-bogota-1.oraclecloud.com" }
  skip_region_validation      = true
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  skip_s3_checksum            = true
  use_path_style              = true
}
```

NADA de `use_lockfile` (OCI no implementa If-None-Match de forma fiable).
Se serializa con `concurrency` en Actions.

- OUT raiz: `app_public_ip, app_hostname, app_url, instance_id, db_hostname, db_port,
  jdbc_url, namespace, bucket_name, backend_image_repo, ml_image_repo, ocir_endpoint`

## 4. Dependencia circular — como se rompe

El Caddyfile necesita `app_hostname`, que sale de `compute`; pero el Caddyfile va dentro de
`cloud_init`, que es INPUT de `compute`. Solucion: cloud-init escribe Caddyfile y compose
ESTATICOS que leen todo de `/opt/financeai/.env`. Ese `.env` lo escribe el job `deploy`
por SSH. Nunca templatear hostname ni tags de imagen dentro de cloud-init.

cloud-init DEBE abrir el firewall del host (las imagenes OCI dropean todo menos el 22):

```
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save
```

## 5. Servicios y puertos

| Servicio | Puerto | Imagen | Contexto de build |
|---|---|---|---|
| backend (Spring Boot 4.1.0, Java 17) | 8080 | `bog.ocir.io/axqvu1tysl6x/financeai/backend` | `backend-financeAI/finance-ai-api` |
| ml-service (FastAPI) | 8000 | `bog.ocir.io/axqvu1tysl6x/financeai/ml-service` | **RAIZ DEL REPO** |
| caddy | 80/443 | `caddy:2-alpine` | — |

`feature-financeAI/ml-service/app.py` hace `sys.path.insert` a
`feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-clasificador-gastos/ml-service/clasificador` y
`feature-financeAI/G9-LATAM-Team-80-FinanceAI-feature-recomendaciones/ml-service/recomendaciones`.
Por eso el contexto es la raiz. Usar `-f feature-financeAI/ml-service/Dockerfile`.

Endpoints reales del ml-service: `GET /health`, `POST /clasificar-transacciones`,
`POST /analisis-financiero`.
Endpoint de salud del backend: `GET /api/health` -> `{"status":"UP",...}`.

## 6. Variables de entorno del backend (de application.properties, ya existentes)

```
PORT=8080
ML_SERVICE_BASE_URL=http://ml-service:8000
FRONTEND_ORIGIN=https://<app_hostname>
DB_URL=jdbc:mysql://<db_hostname>:3306/financeai?useUnicode=true&characterEncoding=UTF-8&serverTimezone=America/Lima
DB_USER
DB_PASSWORD
SESSION_HOURS=24
```

`spring.jpa.hibernate.ddl-auto=validate` => el esquema DEBE existir antes de arrancar el backend.

## 7. Secrets / variables de GitHub (nombres exactos)

```
SECRETS  : OCI_TENANCY_OCID, OCI_USER_OCID, OCI_COMPARTMENT_OCID, OCI_FINGERPRINT,
           OCI_PRIVATE_KEY, OCIR_USERNAME, OCIR_AUTH_TOKEN, OCI_S3_ACCESS_KEY,
           OCI_S3_SECRET_KEY, DB_ADMIN_PASSWORD, SSH_PRIVATE_KEY, SSH_PUBLIC_KEY
VARIABLES: OCI_REGION, OCI_REGION_KEY, OCI_NAMESPACE, OCI_AVAILABILITY_DOMAIN,
           TFSTATE_BUCKET, FRONTEND_BUCKET, DB_ADMIN_USERNAME
```

`OCI_S3_*` se exportan como `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` para el backend de estado.

## 8. Reglas duras

1. Runners de build: `runs-on: ubuntu-24.04-arm`. La VM es aarch64; una imagen amd64 muere
   con `exec format error`. El repo es publico => runners ARM gratis. NO usar QEMU.
2. Idempotencia obligatoria: `IF NOT EXISTS` en todo el SQL, seed con
   `ON DUPLICATE KEY UPDATE`, `docker compose up -d`, `bulk-upload --overwrite`,
   tag por SHA fijado en `.env`.
3. Orden en el primer run: `terraform` ANTES de `build-*` (si no, OCIR auto-crea los repos y
   Terraform da 409). `db-migrate` SIEMPRE antes de `deploy`.
4. Cero secretos hardcodeados en HCL, Dockerfiles, compose o workflows.
   Todo por variable/secret.
5. No mover ni renombrar codigo de aplicacion:
   `tests/contract/test_categorias_consistentes.py` hace grep sobre rutas relativas y se rompe.
6. Volumenes nombrados `caddy_data` y `caddy_config` para no re-emitir certificados en cada deploy.
7. `mem_limit` y `cpus` explicitos en compose: solo hay 2 OCPU / 12 GB para todo.
