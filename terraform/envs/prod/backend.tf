terraform {
  backend "s3" {
    bucket                      = "financeai_tfstate"
    key                         = "prod/terraform.tfstate"
    region                      = "sa-bogota-1"
    endpoints                   = { s3 = "https://axqvu1tysl6x.compat.objectstorage.sa-bogota-1.oraclecloud.com" }
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
