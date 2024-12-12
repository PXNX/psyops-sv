DEFINE TABLE newspapers SCHEMAFULL;
DEFINE FIELD avatar ON newspapers TYPE string;
DEFINE FIELD name ON newspapers TYPE string ASSERT $value IS string AND $value.length() <= 40;
DEFINE FIELD background ON newspapers TYPE string;
DEFINE FIELD created_at ON newspapers TYPE datetime VALUE time::now();

DEFINE FIELD rank ON journalists TYPE string ASSERT $value IN ["author", "editor", "owner"];
DEFINE TABLE journalists SCHEMAFULL;
DEFINE FIELD user_id ON journalists TYPE string;
DEFINE FIELD newspaper_id ON journalists TYPE string;
DEFINE INDEX user_newspaper_index ON journalists FIELDS user_id, newspaper_id UNIQUE;

DEFINE TABLE articles SCHEMAFULL;
DEFINE FIELD title ON articles TYPE string ASSERT $value IS string AND $value.length() <= 40;
DEFINE FIELD content ON articles TYPE string;
DEFINE FIELD author_id ON articles TYPE string;
DEFINE FIELD newspaper_id ON articles TYPE string;
DEFINE FIELD created_at ON articles TYPE datetime VALUE time::now();

DEFINE TABLE upvotes SCHEMAFULL;
DEFINE FIELD user_id ON upvotes TYPE string;
DEFINE FIELD article_id ON upvotes TYPE string;
DEFINE INDEX user_article_index ON upvotes FIELDS user_id, article_id UNIQUE;