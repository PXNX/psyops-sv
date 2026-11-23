-- Computing chain: server hardware and the datacenters built from it.
-- Product inventory rows use the product_type enum; add the two new products.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block; run each
-- statement on its own.
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'hardware';
ALTER TYPE product_type ADD VALUE IF NOT EXISTS 'datacenter';
