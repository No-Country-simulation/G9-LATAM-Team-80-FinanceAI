variable "compartment_ocid" {
  description = "OCID del compartment donde se crea el DB System de MySQL."
  type        = string
}

variable "availability_domain" {
  description = "Availability Domain donde se despliega el DB System (Bogota tiene un unico AD)."
  type        = string
}

variable "subnet_id" {
  description = "OCID de la subred privada donde vive el DB System de MySQL."
  type        = string
}

variable "db_nsg_id" {
  description = "OCID del Network Security Group de la base de datos (permite 3306 solo desde el NSG de la app)."
  type        = string
}

variable "db_admin_username" {
  description = "Nombre de usuario administrador de MySQL."
  type        = string
  default     = "admin"
}

variable "db_admin_password" {
  description = "Password del usuario administrador de MySQL. Sensible, nunca se genera con random_password ni se expone por output."
  type        = string
  sensitive   = true
}

variable "name_prefix" {
  description = "Prefijo usado para nombrar los recursos del modulo."
  type        = string
  default     = "financeai"
}
