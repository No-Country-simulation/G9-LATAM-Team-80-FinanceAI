# --- Autenticacion / provider OCI ---

variable "tenancy_ocid" {
  description = "OCID de la tenancy."
  type        = string
}

variable "user_ocid" {
  description = "OCID del usuario usado para autenticar contra la API de OCI."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint de la clave API subida al usuario de OCI."
  type        = string
}

variable "private_key" {
  description = "Contenido (PEM) de la clave privada API. NO es un path."
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Region de OCI donde se despliegan los recursos."
  type        = string
  default     = "sa-bogota-1"
}

# --- Compartment / naming ---

variable "compartment_ocid" {
  description = "OCID del compartment donde se crean todos los recursos."
  type        = string
}

variable "name_prefix" {
  description = "Prefijo usado para nombrar los recursos en todos los modulos."
  type        = string
  default     = "financeai"
}

variable "freeform_tags" {
  description = "Tags freeform aplicados a los recursos de red."
  type        = map(string)
  default     = {}
}

# --- Red ---

variable "vcn_cidr" {
  description = "Bloque CIDR de la VCN."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Bloque CIDR de la subred publica."
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "Bloque CIDR de la subred privada."
  type        = string
  default     = "10.0.2.0/24"
}

variable "ssh_ingress_cidr" {
  description = "Bloque CIDR permitido para ingreso SSH (puerto 22) al NSG de la app."
  type        = string
}

# --- Compute ---

variable "ssh_public_key" {
  description = "Clave publica SSH (formato OpenSSH) para acceso a la instancia."
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

# --- Database ---

variable "db_admin_username" {
  description = "Nombre de usuario administrador de MySQL."
  type        = string
  default     = "admin"
}

variable "db_admin_password" {
  description = "Password del usuario administrador de MySQL. Sensible."
  type        = string
  sensitive   = true
}

# --- Storage / OCIR ---

variable "bucket_name" {
  description = "Nombre del bucket de Object Storage para el frontend."
  type        = string
  default     = "financeai-frontend"
}

variable "ocir_region_key" {
  description = "Region key de OCIR (ej. \"bog\")."
  type        = string
  default     = "bog"
}
