/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as demo_cleanup from "../demo/cleanup.js";
import type * as demo_controller from "../demo/controller.js";
import type * as demo_fixtures from "../demo/fixtures.js";
import type * as demo_seed from "../demo/seed.js";
import type * as demo_service from "../demo/service.js";
import type * as http from "../http.js";
import type * as imports_controller from "../imports/controller.js";
import type * as imports_model from "../imports/model.js";
import type * as imports_parse from "../imports/parse.js";
import type * as maintenance_controller from "../maintenance/controller.js";
import type * as maintenance_dto from "../maintenance/dto.js";
import type * as maintenance_model from "../maintenance/model.js";
import type * as maintenance_repository from "../maintenance/repository.js";
import type * as maintenance_service from "../maintenance/service.js";
import type * as organizations_controller from "../organizations/controller.js";
import type * as organizations_dto from "../organizations/dto.js";
import type * as organizations_model from "../organizations/model.js";
import type * as organizations_repository from "../organizations/repository.js";
import type * as organizations_service from "../organizations/service.js";
import type * as properties_controller from "../properties/controller.js";
import type * as properties_dto from "../properties/dto.js";
import type * as properties_model from "../properties/model.js";
import type * as properties_repository from "../properties/repository.js";
import type * as properties_service from "../properties/service.js";
import type * as shared_authorization from "../shared/authorization.js";
import type * as workflows_demoDelivery from "../workflows/demoDelivery.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "demo/cleanup": typeof demo_cleanup;
  "demo/controller": typeof demo_controller;
  "demo/fixtures": typeof demo_fixtures;
  "demo/seed": typeof demo_seed;
  "demo/service": typeof demo_service;
  http: typeof http;
  "imports/controller": typeof imports_controller;
  "imports/model": typeof imports_model;
  "imports/parse": typeof imports_parse;
  "maintenance/controller": typeof maintenance_controller;
  "maintenance/dto": typeof maintenance_dto;
  "maintenance/model": typeof maintenance_model;
  "maintenance/repository": typeof maintenance_repository;
  "maintenance/service": typeof maintenance_service;
  "organizations/controller": typeof organizations_controller;
  "organizations/dto": typeof organizations_dto;
  "organizations/model": typeof organizations_model;
  "organizations/repository": typeof organizations_repository;
  "organizations/service": typeof organizations_service;
  "properties/controller": typeof properties_controller;
  "properties/dto": typeof properties_dto;
  "properties/model": typeof properties_model;
  "properties/repository": typeof properties_repository;
  "properties/service": typeof properties_service;
  "shared/authorization": typeof shared_authorization;
  "workflows/demoDelivery": typeof workflows_demoDelivery;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
