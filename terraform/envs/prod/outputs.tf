output "app_public_ip" {
  description = "IP publica de la instancia de la aplicacion."
  value       = module.compute.public_ip
}

output "app_hostname" {
  description = "Hostname sslip.io derivado de la IP publica de la instancia."
  value       = module.compute.app_hostname
}

output "app_url" {
  description = "URL publica de la aplicacion (HTTPS via sslip.io)."
  value       = "https://${module.compute.app_hostname}"
}

output "instance_id" {
  description = "OCID de la instancia compute."
  value       = module.compute.instance_id
}

output "db_hostname" {
  description = "FQDN del DB System de MySQL."
  value       = module.database.db_hostname
}

output "db_port" {
  description = "Puerto de conexion del DB System de MySQL."
  value       = module.database.db_port
}

output "jdbc_url" {
  description = "Cadena de conexion JDBC hacia el DB System de MySQL."
  value       = "jdbc:mysql://${module.database.db_hostname}:${module.database.db_port}/financeai?useUnicode=true&characterEncoding=UTF-8&serverTimezone=America/Lima"
}

output "namespace" {
  description = "Namespace de Object Storage del tenancy."
  value       = module.storage.namespace
}

output "bucket_name" {
  description = "Nombre del bucket de Object Storage del frontend."
  value       = module.storage.bucket_name
}

output "backend_image_repo" {
  description = "Ruta completa del repositorio OCIR del backend."
  value       = module.storage.backend_image_repo
}

output "ml_image_repo" {
  description = "Ruta completa del repositorio OCIR del ml-service."
  value       = module.storage.ml_image_repo
}

output "ocir_endpoint" {
  description = "Endpoint del registro de contenedores OCIR."
  value       = module.storage.ocir_endpoint
}
