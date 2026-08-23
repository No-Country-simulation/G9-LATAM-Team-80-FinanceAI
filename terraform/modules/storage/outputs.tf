output "namespace" {
  description = "Namespace de Object Storage del tenancy."
  value       = data.oci_objectstorage_namespace.this.namespace
}

output "bucket_name" {
  description = "Nombre del bucket de Object Storage del frontend."
  value       = oci_objectstorage_bucket.frontend.name
}

output "bucket_base_url" {
  description = "URL base para acceder a objetos publicos del bucket via GET anonimo."
  value       = "https://objectstorage.${var.region}.oraclecloud.com/n/${data.oci_objectstorage_namespace.this.namespace}/b/${oci_objectstorage_bucket.frontend.name}/o"
}

output "ocir_endpoint" {
  description = "Endpoint del registro de contenedores OCIR."
  value       = "${var.ocir_region_key}.ocir.io"
}

output "backend_image_repo" {
  description = "Ruta completa del repositorio OCIR del backend."
  value       = "${var.ocir_region_key}.ocir.io/${data.oci_objectstorage_namespace.this.namespace}/${oci_artifacts_container_repository.backend.display_name}"
}

output "ml_image_repo" {
  description = "Ruta completa del repositorio OCIR del ml-service."
  value       = "${var.ocir_region_key}.ocir.io/${data.oci_objectstorage_namespace.this.namespace}/${oci_artifacts_container_repository.ml_service.display_name}"
}
