terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 7.0"
    }
  }
}

resource "oci_mysql_mysql_db_system" "this" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  subnet_id           = var.subnet_id
  nsg_ids             = [var.db_nsg_id]

  shape_name          = "MySQL.Free"
  is_highly_available = false

  admin_username = var.db_admin_username
  admin_password = var.db_admin_password

  hostname_label = "${var.name_prefix}-db"
  display_name   = "${var.name_prefix}-mysql"

  # 50 GiB fijos en MySQL.Free: NO declarar data_storage_size_in_gb.
  # Retencion de backup fija en 1 dia y PITR deshabilitado en Always Free: NO declarar backup_policy custom.

  deletion_policy {
    is_delete_protected        = false
    final_backup               = "SKIP_FINAL_BACKUP"
    automatic_backup_retention = "DELETE"
  }
}
