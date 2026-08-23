variable "compartment_ocid" {
  description = "OCID del compartment donde se crean los recursos de compute."
  type        = string
}

variable "availability_domain" {
  description = "Availability domain donde se crea la instancia (unico en sa-bogota-1)."
  type        = string
}

variable "public_subnet_id" {
  description = "OCID de la subred publica donde se adjunta la VNIC de la instancia."
  type        = string
}

variable "app_nsg_id" {
  description = "OCID del Network Security Group de aplicacion a asociar con la VNIC."
  type        = string
}

variable "ssh_public_key" {
  description = "Clave publica SSH (formato OpenSSH) para acceso a la instancia."
  type        = string
}

variable "cloud_init" {
  description = "Script cloud-init ya renderizado (texto plano) para inicializar la instancia."
  type        = string
}

variable "instance_ocpus" {
  description = "Numero de OCPUs para la instancia A1 Flex. NO subir del limite Always Free."
  type        = number
  default     = 2
}

variable "instance_memory_gb" {
  description = "Memoria en GB para la instancia A1 Flex. NO subir del limite Always Free."
  type        = number
  default     = 12
}

variable "boot_volume_gb" {
  description = "Tamano del boot volume en GB."
  type        = number
  default     = 50
}

variable "name_prefix" {
  description = "Prefijo usado para nombrar los recursos de compute."
  type        = string
}
