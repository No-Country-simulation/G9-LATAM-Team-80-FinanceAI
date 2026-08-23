variable "tenancy_ocid" {
  description = "OCID del tenancy. Se usa como compartment_id del data source de namespace de Object Storage."
  type        = string
}

variable "compartment_ocid" {
  description = "OCID del compartment donde se crean el bucket y los repositorios OCIR."
  type        = string
}

variable "bucket_name" {
  description = "Nombre del bucket de Object Storage para el frontend."
  type        = string
  default     = "financeai-frontend"
}

variable "ocir_region_key" {
  description = "Region key de OCIR (ej. \"bog\"). No existe data source que la derive; siempre viene por variable."
  type        = string
  default     = "bog"
}

variable "name_prefix" {
  description = "Prefijo de nombre para recursos de este modulo."
  type        = string
}

# No listada explicitamente en el contrato, pero necesaria para construir bucket_base_url
# (https://objectstorage.<region>.oraclecloud.com/...). Region de Object Storage, ej. "sa-bogota-1".
variable "region" {
  description = "Region de OCI (ej. \"sa-bogota-1\"), usada para construir bucket_base_url."
  type        = string
  default     = "sa-bogota-1"
}
