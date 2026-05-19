import Link from "../../links/schema.js";

const toAdminLink = (link) => ({
  _id: link._id,
  ownerType: link.ownerType,
  userId: link.userId,
  guestId: link.guestId,
  owner: link.owner
    ? {
        _id: link.owner._id,
        name: link.owner.name,
        email: link.owner.email,
        avatar: link.owner.avatar,
        company: link.owner.company,
        role: link.owner.role,
      }
    : null,
  alias: link.alias,
  longUrl: link.longUrl,
  shortUrl: link.shortUrl,
  qrCode: link.qrCode,
  clicks: link.clicks,
  isActive: link.isActive,
  isDeleted: link.isDeleted,
  deletedAt: link.deletedAt,
  expiresAt: link.expiresAt,
  createdAt: link.createdAt,
  updatedAt: link.updatedAt,
});

const buildBaseMatch = ({ status, ownerType }) => {
  const match = {};

  if (ownerType && ownerType !== "all") {
    match.ownerType = ownerType === "user" ? "User" : "Guest";
  }

  if (status === "active") {
    match.isDeleted = false;
    match.isActive = true;
  } else if (status === "inactive") {
    match.isDeleted = false;
    match.isActive = false;
  } else if (status === "deleted") {
    match.isDeleted = true;
  }

  return match;
};

const buildSearchMatch = (search) => {
  if (!search) return null;

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  return {
    $or: [
      { alias: regex },
      { longUrl: regex },
      { shortUrl: regex },
      { ownerType: regex },
      { "owner.name": regex },
      { "owner.email": regex },
      { "owner.company": regex },
      { "owner.role": regex },
    ],
  };
};

export const getAdminLinks = async (req, res) => {
  const { page, limit, search = "", status = "all", ownerType = "all" } = req.query;
  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = parseInt(limit, 10) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  try {
    const baseMatch = buildBaseMatch({ status, ownerType });
    const searchMatch = buildSearchMatch(search);

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (searchMatch) {
      pipeline.push({ $match: searchMatch });
    }

    pipeline.push({ $sort: { createdAt: -1 } });

    const [summary, result] = await Promise.all([
      Promise.all([
        Link.countDocuments(),
        Link.countDocuments({ isDeleted: false, isActive: true }),
        Link.countDocuments({ isDeleted: false, isActive: false }),
        Link.countDocuments({ isDeleted: true }),
        Link.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: null, totalClicks: { $sum: "$clicks" } } },
        ]),
        Link.countDocuments({ ownerType: "User", isDeleted: false }),
        Link.countDocuments({ ownerType: "Guest", isDeleted: false }),
      ]),
      Link.aggregate([
        ...pipeline,
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limitNumber }],
            total: [{ $count: "count" }],
          },
        },
      ]),
    ]);

    const [totalLinks, activeLinks, inactiveLinks, deletedLinks, clicksAgg, userLinks, guestLinks] = summary;
    const aggregateResult = result[0] || { data: [], total: [] };
    const total = aggregateResult.total[0]?.count || 0;
    const links = aggregateResult.data.map((link) => toAdminLink(link));

    return res.status(200).json({
      success: true,
      message: "Links fetched successfully",
      data: links,
      summary: {
        totalLinks,
        activeLinks,
        inactiveLinks,
        deletedLinks,
        totalClicks: clicksAgg[0]?.totalClicks || 0,
        userLinks,
        guestLinks,
      },
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        skip,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch links",
      data: [],
    });
  }
};

export const toggleAdminLinkStatus = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: "Link not found" });
    }

    if (link.isDeleted) {
      return res.status(400).json({ success: false, message: "Restore the link before changing its status" });
    }

    link.isActive = !link.isActive;
    await link.save();

    return res.status(200).json({
      success: true,
      message: `Link ${link.isActive ? "activated" : "deactivated"} successfully`,
      data: toAdminLink(link.toObject()),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to update link" });
  }
};

export const deleteAdminLink = async (req, res) => {
  const hard = req.query.hard === "true";

  try {
    const link = await Link.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: "Link not found" });
    }

    if (hard) {
      await Link.deleteOne({ _id: req.params.id });
      return res.status(200).json({ success: true, message: "Link permanently deleted" });
    }

    link.isDeleted = true;
    link.deletedAt = new Date();
    link.isActive = false;
    await link.save();

    return res.status(200).json({ success: true, message: "Link deleted successfully", data: toAdminLink(link.toObject()) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to delete link" });
  }
};

export const restoreAdminLink = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: "Link not found" });
    }

    link.isDeleted = false;
    link.deletedAt = null;
    link.isActive = true;
    await link.save();

    return res.status(200).json({ success: true, message: "Link restored successfully", data: toAdminLink(link.toObject()) });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to restore link" });
  }
};

export const bulkAdminLinksAction = async (req, res) => {
  const { ids, action } = req.body;

  try {
    let result;

    if (action === "hardDelete") {
      result = await Link.deleteMany({ _id: { $in: ids } });
    } else if (action === "delete") {
      result = await Link.updateMany(
        { _id: { $in: ids } },
        { $set: { isDeleted: true, isActive: false, deletedAt: new Date() } },
      );
    } else if (action === "restore") {
      result = await Link.updateMany(
        { _id: { $in: ids } },
        { $set: { isDeleted: false, isActive: true }, $unset: { deletedAt: "" } },
      );
    } else if (action === "activate") {
      result = await Link.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isActive: true } },
      );
    } else if (action === "deactivate") {
      result = await Link.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isActive: false } },
      );
    }

    return res.status(200).json({
      success: true,
      message: `Bulk action '${action}' completed successfully`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Failed to process bulk action" });
  }
};
