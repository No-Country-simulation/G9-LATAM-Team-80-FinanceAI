terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 7.0"
    }
  }
}

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "this" {
  compartment_id      = var.compartment_ocid
  availability_domain = var.availability_domain
  display_name        = "${var.name_prefix}-app"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  create_vnic_details {
    subnet_id        = var.public_subnet_id
    nsg_ids          = [var.app_nsg_id]
    assign_public_ip = false
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_gb
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(var.cloud_init)
  }
}

data "oci_core_private_ips" "app" {
  subnet_id  = var.public_subnet_id
  ip_address = oci_core_instance.this.private_ip
}

resource "oci_core_public_ip" "app" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.name_prefix}-app-public-ip"
  lifetime       = "RESERVED"
  private_ip_id  = data.oci_core_private_ips.app.private_ips[0].id
}
