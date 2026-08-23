locals {
  cloud_init_rendered = templatefile("${path.module}/cloud-init/cloud-init.yaml.tftpl", {
  })
}

module "network" {
  source = "../../modules/network"

  compartment_ocid    = var.compartment_ocid
  tenancy_ocid        = var.tenancy_ocid
  vcn_cidr            = var.vcn_cidr
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
  ssh_ingress_cidr    = var.ssh_ingress_cidr
  name_prefix         = var.name_prefix
  freeform_tags       = var.freeform_tags
}

module "compute" {
  source = "../../modules/compute"

  compartment_ocid    = var.compartment_ocid
  availability_domain = module.network.availability_domain
  public_subnet_id    = module.network.public_subnet_id
  app_nsg_id          = module.network.app_nsg_id
  ssh_public_key      = var.ssh_public_key
  cloud_init          = local.cloud_init_rendered
  instance_shape      = var.instance_shape
  instance_ocpus      = var.instance_ocpus
  instance_memory_gb  = var.instance_memory_gb
  boot_volume_gb      = var.boot_volume_gb
  name_prefix         = var.name_prefix
}

module "database" {
  source = "../../modules/database"

  compartment_ocid    = var.compartment_ocid
  availability_domain = module.network.availability_domain
  subnet_id           = module.network.private_subnet_id
  db_nsg_id           = module.network.db_nsg_id
  db_admin_username   = var.db_admin_username
  db_admin_password   = var.db_admin_password
  name_prefix         = var.name_prefix
}

module "storage" {
  source = "../../modules/storage"

  tenancy_ocid     = var.tenancy_ocid
  compartment_ocid = var.compartment_ocid
  bucket_name      = var.bucket_name
  ocir_region_key  = var.ocir_region_key
  name_prefix      = var.name_prefix
  region           = var.region
}
