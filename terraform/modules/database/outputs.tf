output "db_system_id" {
  description = "OCID del DB System de MySQL."
  value       = oci_mysql_mysql_db_system.this.id
}

output "db_private_ip" {
  description = "Direccion IP privada del DB System de MySQL."
  value       = oci_mysql_mysql_db_system.this.ip_address
}

output "db_port" {
  description = "Puerto de conexion del DB System de MySQL."
  value       = oci_mysql_mysql_db_system.this.port
}

output "db_hostname" {
  description = "FQDN (hostname) del DB System de MySQL, usado para construir la cadena de conexion JDBC."
  value       = oci_mysql_mysql_db_system.this.endpoints[0].hostname
}

output "db_admin_username" {
  description = "Nombre de usuario administrador de MySQL."
  value       = var.db_admin_username
}
