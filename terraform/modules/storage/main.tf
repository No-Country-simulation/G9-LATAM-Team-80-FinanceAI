terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 7.0"
    }
  }
}

# El namespace de Object Storage es propio del tenancy, no del compartment; se deriva
# siempre via data source (compartment_id = tenancy_ocid), nunca hardcodeado.
data "oci_objectstorage_namespace" "this" {
  compartment_id = var.tenancy_ocid
}

resource "oci_objectstorage_bucket" "frontend" {
  compartment_id = var.compartment_ocid
  namespace      = data.oci_objectstorage_namespace.this.namespace
  name           = var.bucket_name

  # ObjectReadWithoutList: permite GET anonimo de un objeto conociendo su nombre,
  # sin exponer el listado del bucket. Valores validos: NoPublicAccess, ObjectRead,
  # ObjectReadWithoutList.
  access_type = "ObjectReadWithoutList"

  freeform_tags = {
    "name_prefix" = var.name_prefix
  }
}

resource "oci_artifacts_container_repository" "backend" {
  compartment_id = var.compartment_ocid
  display_name   = "financeai/backend"

  # is_public = true: evita tener que hacer `docker login` en la VM para poder
  # hacer `docker pull` de las imagenes en el deploy.
  is_public = true
}

resource "oci_artifacts_container_repository" "ml_service" {
  compartment_id = var.compartment_ocid
  display_name   = "financeai/ml-service"

  # is_public = true: evita tener que hacer `docker login` en la VM para poder
  # hacer `docker pull` de las imagenes en el deploy.
  is_public = true
}
