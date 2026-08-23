output "instance_id" {
  description = "OCID de la instancia compute."
  value       = oci_core_instance.this.id
}

output "instance_private_ip" {
  description = "IP privada de la instancia."
  value       = oci_core_instance.this.private_ip
}

output "public_ip" {
  description = "IP publica reservada asociada a la instancia."
  value       = oci_core_public_ip.app.ip_address
}

output "public_ip_dashed" {
  description = "IP publica con puntos reemplazados por guiones, para hostname sslip.io."
  value       = replace(oci_core_public_ip.app.ip_address, ".", "-")
}

output "app_hostname" {
  description = "Hostname sslip.io derivado de la IP publica."
  value       = "${replace(oci_core_public_ip.app.ip_address, ".", "-")}.sslip.io"
}
