import { defineSchema } from "convex/server";
import { organizationTables } from "./organizations/model";
import { propertyTables } from "./properties/model";
import { maintenanceTables } from "./maintenance/model";
import { importTables } from "./imports/model";

export default defineSchema({
  ...organizationTables,
  ...propertyTables,
  ...maintenanceTables,
  ...importTables,
});
