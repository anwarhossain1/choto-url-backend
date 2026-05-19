import express from "express";
import { verifyAdminAccessToken } from "../../../middlewares/auth/verifyAdminAccessToken.js";
import { logRequest } from "../../../middlewares/log/index.js";
import { validateRequest } from "../../../middlewares/request-validate/index.js";
import {
  adminLinkIdParamSchema,
  adminLinksQuerySchema,
  bulkAdminLinksSchema,
} from "./request.js";
import {
  bulkAdminLinksAction,
  deleteAdminLink,
  getAdminLinks,
  restoreAdminLink,
  toggleAdminLinkStatus,
} from "./service.js";

const router = express.Router();

router.get(
  "/all-links",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: adminLinksQuerySchema, isParam: false }),
  async (req, res) => getAdminLinks(req, res),
);

router.patch(
  "/all-links/:id/toggle-status",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: adminLinkIdParamSchema, isParam: true }),
  async (req, res) => toggleAdminLinkStatus(req, res),
);

router.delete(
  "/all-links/:id",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: adminLinkIdParamSchema, isParam: true }),
  async (req, res) => deleteAdminLink(req, res),
);

router.post(
  "/all-links/:id/restore",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: adminLinkIdParamSchema, isParam: true }),
  async (req, res) => restoreAdminLink(req, res),
);

router.post(
  "/all-links/bulk",
  verifyAdminAccessToken,
  logRequest({}),
  validateRequest({ schema: bulkAdminLinksSchema, isParam: false }),
  async (req, res) => bulkAdminLinksAction(req, res),
);

export default router;
