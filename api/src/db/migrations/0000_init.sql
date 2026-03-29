CREATE TABLE IF NOT EXISTS `products` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `sku` text NOT NULL,
  `price` real NOT NULL,
  `discount_rate` real,
  `metadata` text
);

CREATE TABLE IF NOT EXISTS `wide_metrics` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `label` text NOT NULL,
  `region` text NOT NULL,
  `category` text NOT NULL,
  `metric1` real NOT NULL,
  `metric2` real NOT NULL,
  `metric3` real NOT NULL,
  `metric4` real NOT NULL,
  `metric5` real NOT NULL,
  `metric6` real NOT NULL,
  `optional_metric1` real,
  `optional_metric2` real,
  `tags` text
);

CREATE TABLE IF NOT EXISTS `json_documents` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `category` text NOT NULL,
  `version` real NOT NULL,
  `payload` text NOT NULL,
  `notes` text
);
