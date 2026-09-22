"""MySQL database setup (PyMySQL) — creates DB and tables on startup."""
from __future__ import annotations

import pymysql
from pymysql.cursors import DictCursor

from flask import Flask, current_app, g

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100),
      phone VARCHAR(15),
      state VARCHAR(50),
      district VARCHAR(50),
      village VARCHAR(100),
      lat DECIMAL(10,8),
      lng DECIMAL(11,8),
      main_crop VARCHAR(50),
      land_acres DECIMAL(6,2),
      has_irrigation BOOLEAN DEFAULT FALSE,
      preferred_language VARCHAR(5) DEFAULT 'hi',
      ui_mode VARCHAR(10) DEFAULT 'smart',
      theme VARCHAR(10) DEFAULT 'light',
      profile_pic VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT TRUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS predictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      image_path VARCHAR(255),
      disease_name VARCHAR(100),
      hindi_name VARCHAR(100),
      confidence DECIMAL(5,4),
      severity VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_predictions_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS community_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      title VARCHAR(200),
      content TEXT,
      category VARCHAR(50),
      image_path VARCHAR(255),
      likes INT DEFAULT 0,
      state VARCHAR(50),
      district VARCHAR(50),
      language VARCHAR(5) DEFAULT 'hi',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS post_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT,
      user_id INT,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES community_posts(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      CONSTRAINT fk_likes_post FOREIGN KEY (post_id) REFERENCES community_posts(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS weather_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cache_key VARCHAR(64) NOT NULL UNIQUE,
      lat DECIMAL(10,8),
      lng DECIMAL(11,8),
      data JSON,
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS mandi_cache (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cache_key VARCHAR(128) NOT NULL UNIQUE,
      crop VARCHAR(50),
      state VARCHAR(50),
      data JSON,
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      jti VARCHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_revoked_exp (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
]


def _connect_server():
    return pymysql.connect(
        host=current_app.config["MYSQL_HOST"],
        port=current_app.config["MYSQL_PORT"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASS"],
        charset="utf8mb4",
        cursorclass=DictCursor,
    )


def get_db():
    if "db" not in g:
        g.db = pymysql.connect(
            host=current_app.config["MYSQL_HOST"],
            port=current_app.config["MYSQL_PORT"],
            user=current_app.config["MYSQL_USER"],
            password=current_app.config["MYSQL_PASS"],
            database=current_app.config["MYSQL_DB"],
            charset="utf8mb4",
            cursorclass=DictCursor,
            autocommit=False,
        )
    return g.db


def init_db(app: Flask) -> None:
    with app.app_context():
        db_name = app.config["MYSQL_DB"]
        try:
            conn = _connect_server()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
                conn.commit()
            finally:
                conn.close()

            conn = pymysql.connect(
                host=app.config["MYSQL_HOST"],
                port=app.config["MYSQL_PORT"],
                user=app.config["MYSQL_USER"],
                password=app.config["MYSQL_PASS"],
                database=db_name,
                charset="utf8mb4",
                cursorclass=DictCursor,
            )
            try:
                with conn.cursor() as cur:
                    for stmt in SCHEMA_STATEMENTS:
                        cur.execute(stmt)
                conn.commit()
            finally:
                conn.close()
        except Exception as exc:
            app.logger.warning("MySQL unavailable; continuing in demo mode. Error: %s", exc)
            return


def close_db(_error=None) -> None:
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()
