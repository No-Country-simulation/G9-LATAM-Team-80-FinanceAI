output "vcn_id" {
  description = "OCID de la VCN creada."
  value       = oci_core_vcn.this.id
}

output "public_subnet_id" {
  description = "OCID de la subred publica."
  value       = oci_core_subnet.public.id
}

output "private_subnet_id" {
  description = "OCID de la subred privada."
  value       = oci_core_subnet.private.id
}

output "app_nsg_id" {
  description = "OCID del network security group para la app."
  value       = oci_core_network_security_group.app.id
}

output "db_nsg_id" {
  description = "OCID del network security group para la base de datos."
  value       = oci_core_network_security_group.db.id
}

output "availability_domain" {
  description = "Nombre del primer availability domain disponible en la tenancy."
  value       = data.oci_identity_availability_domains.ads.availability_domains[0].name
}

output "availability_domains" {
  description = "Lista de nombres de todos los availability domains disponibles en la tenancy."
  value       = [for ad in data.oci_identity_availability_domains.ads.availability_domains : ad.name]
}
