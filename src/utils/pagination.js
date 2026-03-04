export const getPagination = ({ page, limit, total }) => {
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if (!pageNumber || pageNumber < 1) {
    throw new Error("Invalid page number");
  }

  if (!limitNumber || limitNumber < 1) {
    throw new Error("Invalid limit number");
  }

  const skip = (pageNumber - 1) * limitNumber;
  const totalPages = Math.ceil(total / limitNumber);

  return {
    page: pageNumber,
    limit: limitNumber,
    skip,
    total,
    totalPages,
  };
};
