variable "compartment_ocid" {
  description = "OCID del compartment donde se crean los recursos de red."
  type        = string
}

variable "tenancy_ocid" {
  description = "OCID de la tenancy, usado para consultar los availability domains."
  type        = string
}

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

variable "name_prefix" {
  description = "Prefijo usado para nombrar los recursos de red."
  type        = string
}

variable "freeform_tags" {
  description = "Tags freeform aplicados a los recursos de red."
  type        = map(string)
  default     = {}
}
