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

variable "instance_shape" {
  description = <<-EOT
    Shape de la instancia. Por defecto VM.Standard.E5.Flex (AMD, x86_64), que
    NO esta en Always Free y consume creditos del trial.

    El objetivo original era VM.Standard.A1.Flex (Ampere, arm64, Always Free),
    pero el API de capacidad de OCI reporta OUT_OF_HOST_CAPACITY en
    sa-bogota-1 incluso a 1 OCPU, y la region tiene un unico AD al que
    reintentar.

    Para volver a A1 cuando haya capacidad basta cambiar este valor, pero hay
    que reconstruir las imagenes para linux/arm64 (ver .github/workflows/cd.yml,
    jobs build-backend y build-ml).
  EOT
  type        = string
  default     = "VM.Standard.E5.Flex"
}
