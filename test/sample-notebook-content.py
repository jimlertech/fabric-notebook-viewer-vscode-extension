# Fabric notebook source

# METADATA ********************

# META {
# META   "kernel_info": {
# META     "name": "synapse_pyspark"
# META   }
# META }

# CELL ********************

# MAGIC %%configure
# MAGIC 
# MAGIC {
# MAGIC     "environment":
# MAGIC         {
# MAGIC         "id":
# MAGIC             {
# MAGIC                 "parameterName": "envId",
# MAGIC                 "defaultValue": ""
# MAGIC             },
# MAGIC         "name":
# MAGIC             {
# MAGIC                 "parameterName": "envName",
# MAGIC                 "defaultValue": "env_starter"
# MAGIC             }
# MAGIC         }
# MAGIC }

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# MARKDOWN ********************

# - **Purpose:** Conform the ConformedVNext adjustment-type dimension to DIM_AdjustmentType (id + type).
# - **Hard inputs:** `lh_bronze.conformedvnext.dim_adjustmenttype`
# - **Soft inputs:** none
# - **Output:** `lh_silver.conformed.dim_adjustmenttype`
# - **Grain:** one row per adjustment type (AdjustmentTypeId)

# CELL ********************

# Libraries
import notebookutils
from pyspark.sql.functions import *
from pyspark.sql.types import *

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

%run nb_generic_functions

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

# Variables

# Storage paths from the vl_storage_paths Variable Library
paths = notebookutils.variableLibrary.getLibrary("vl_storage_paths")
onelake = paths.onelake_endpoint
data_ws = paths.workspace_data
bronze_base = f'abfss://{data_ws}{onelake}/{paths.bronze_root}/Tables'
silver_base = f'abfss://{data_ws}{onelake}/{paths.silver_root}/Tables'

# Inputs
input_adjustmenttype = f'{bronze_base}/conformedvnext/dim_adjustmenttype'

# Output
output_table = f'{silver_base}/conformed/dim_adjustmenttype'

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

# Logic

df_final = (
    spark.read.format("delta").load(input_adjustmenttype)
    .select(col("DIM_AdjustmentTypeId").alias("AdjustmentTypeId"), "AdjustmentType")
)

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }

# CELL ********************

# Output
df_final.write.format("delta").mode("overwrite").option("overwriteSchema", "true").save(output_table)

# METADATA ********************

# META {
# META   "language": "python",
# META   "language_group": "synapse_pyspark"
# META }
