#!/usr/bin/env python3
"""
Clean Blog CMS for Navid Mirnouri's GitHub Pages site.

Usage:
    python build_blog.py new
    python build_blog.py build
    python build_blog.py update-index
    python build_blog.py all
"""

import datetime
import html
import re
import sys
from pathlib import Path

import frontmatter
import markdown


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

ROOT_DIR = Path(__file__).parent.resolve()
POSTS_DIR = ROOT_DIR / "blog" / "posts"
OUTPUT_DIR = ROOT_DIR / "blog"
TEMPLATE_FILE = ROOT_DIR / "post_template.html"
INDEX_FILE = ROOT_DIR / "index.html"

INDEX_START_MARKER = "<!-- BLOG_LIST_START -->"
INDEX_END_MARKER = "<!-- BLOG_LIST_END -->"

DATE_FORMATS = [
    "%B %d, %Y",
    "%B %Y",
    "%Y-%m-%d",
    "%d %B %Y",
    "%b %d, %Y",
    "%b %Y",
]

NEW_POST_TEMPLATE = """---
title: "{title}"
category: "{category}"
tagline: "{tagline}"
date: "{date}"
read_time: "{read_time}"
draft: false
---

Write your post content here in Markdown.

## Introduction

Start with the problem or idea.

## Details

Add sections, lists, links, and code.

    # Indented code block
    print("Hello")

## Conclusion

Wrap it up.
"""


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def ensure_dirs():
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def slugify(value):
    value = str(value).lower().strip()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-") or "post"


def yaml_escape(value):
    value = str(value)
    value = value.replace("\n", " ").replace("\r", " ")
    value = value.replace("\\", "\\\\").replace('"', '\\"')
    return value


def date_to_str(value):
    if isinstance(value, datetime.datetime):
        return value.strftime("%B %d, %Y")
    if isinstance(value, datetime.date):
        return value.strftime("%B %d, %Y")
    return str(value).strip()


def parse_date(value):
    if isinstance(value, datetime.datetime):
        return value

    if isinstance(value, datetime.date):
        return datetime.datetime(value.year, value.month, value.day)

    value = str(value).strip()

    for date_format in DATE_FORMATS:
        try:
            return datetime.datetime.strptime(value, date_format)
        except ValueError:
            pass

    return datetime.datetime.min


def is_draft(value):
    return str(value).strip().lower() in {"true", "yes", "1", "draft"}


def render_template(template, context):
    output = template

    for key, value in context.items():
        placeholder = "{{" + key + "}}"
        output = output.replace(placeholder, str(value))

    return output


def render_markdown(text):
    extensions = [
        "markdown.extensions.fenced_code",
        "markdown.extensions.tables",
        "markdown.extensions.toc",
        "markdown.extensions.smarty",
        "markdown.extensions.sane_lists",
    ]

    return markdown.markdown(text, extensions=extensions)


def load_posts(include_drafts=False):
    posts = []

    for path in sorted(POSTS_DIR.glob("*.md")):
        post = frontmatter.load(path)
        meta = post.metadata

        if not include_drafts and is_draft(meta.get("draft", False)):
            continue

        title = str(meta.get("title", path.stem)).strip()
        category = str(meta.get("category", "Uncategorized")).strip()
        tagline = str(meta.get("tagline", "")).strip()
        date_value = date_to_str(meta.get("date", ""))
        read_time = str(meta.get("read_time", "5 min read")).strip()

        posts.append(
            {
                "path": path,
                "slug": path.stem,
                "title": title,
                "category": category,
                "tagline": tagline,
                "date": date_value,
                "read_time": read_time,
                "content": post.content,
                "sort_date": parse_date(meta.get("date", "")),
            }
        )

    posts.sort(key=lambda item: item["sort_date"], reverse=True)
    return posts


# ------------------------------------------------------------
# Commands
# ------------------------------------------------------------

def cmd_new():
    """
    Create a new Markdown blog post.
    """

    ensure_dirs()

    title = input("Post title: ").strip()
    if not title:
        print("Title cannot be empty.")
        return

    category = input("Category: ").strip() or "Uncategorized"
    tagline = input("Tagline: ").strip()
    read_time = input("Read time, e.g. '10 min read': ").strip() or "5 min read"
    date_value = datetime.date.today().strftime("%B %d, %Y")

    filename = slugify(title) + ".md"
    filepath = POSTS_DIR / filename

    if filepath.exists():
        print(f"File already exists: {filepath}")
        return

    content = NEW_POST_TEMPLATE.format(
        title=yaml_escape(title),
        category=yaml_escape(category),
        tagline=yaml_escape(tagline),
        date=date_value,
        read_time=yaml_escape(read_time),
    )

    filepath.write_text(content, encoding="utf-8")

    print(f"Created new post: {filepath}")
    print("Edit it, then run: python build_blog.py build")


def cmd_build():
    """
    Build HTML files from Markdown posts.
    """

    ensure_dirs()

    if not TEMPLATE_FILE.exists():
        print(f"Missing template file: {TEMPLATE_FILE}")
        return

    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    posts = load_posts(include_drafts=False)

    if not posts:
        print("No published posts found.")
        return

    current_year = datetime.date.today().year

    for post in posts:
        content_html = render_markdown(post["content"])

        context = {
            "TITLE": html.escape(post["title"]),
            "CATEGORY": html.escape(post["category"]),
            "TAGLINE": html.escape(post["tagline"]),
            "DATE_DISPLAY": html.escape(post["date"]),
            "READ_TIME": html.escape(post["read_time"]),
            "CONTENT": content_html,
            "YEAR": current_year,
        }

        output_path = OUTPUT_DIR / f"{post['slug']}.html"
        output_html = render_template(template, context)
        output_path.write_text(output_html, encoding="utf-8")

        print(f"Built: {output_path.relative_to(ROOT_DIR)}")

    print(f"Finished building {len(posts)} post(s).")


def cmd_update_index():
    """
    Update the blog list inside index.html.

    This requires these markers around the blog list in index.html:

        <!-- BLOG_LIST_START -->
        ...
        <!-- BLOG_LIST_END -->
    """

    if not INDEX_FILE.exists():
        print(f"Missing index file: {INDEX_FILE}")
        return

    index_html = INDEX_FILE.read_text(encoding="utf-8")

    if INDEX_START_MARKER not in index_html or INDEX_END_MARKER not in index_html:
        print("Could not find blog list markers in index.html.")
        print("")
        print("Add these markers around your blog list:")
        print(INDEX_START_MARKER)
        print("    <!-- blog entries -->")
        print(INDEX_END_MARKER)
        return

    posts = load_posts(include_drafts=False)

    entries = []

    for post in posts:
        post_url = f"/blog/{post['slug']}.html"

        entry = f"""                    <div class="blog-entry">
                        <span class="blog-date">{html.escape(post["date"])}</span>
                        <span class="blog-category">{html.escape(post["category"])}</span>
                        <h3>{html.escape(post["title"])}</h3>
                        <p>{html.escape(post["tagline"])}</p>
                        <span class="read-time">{html.escape(post["read_time"])}</span>
                        <a href="{post_url}">Read more</a>
                    </div>"""

        entries.append(entry)

    if entries:
        blog_list_html = "\n".join(entries)
    else:
        blog_list_html = "                    <p>No posts yet.</p>"

    before, rest = index_html.split(INDEX_START_MARKER, 1)
    _, after = rest.split(INDEX_END_MARKER, 1)

    updated_html = (
        before
        + INDEX_START_MARKER
        + "\n"
        + blog_list_html
        + "\n"
        + INDEX_END_MARKER
        + after
    )

    INDEX_FILE.write_text(updated_html, encoding="utf-8")

    print(f"Updated blog list in {INDEX_FILE.name}")


def cmd_all():
    """
    Build posts and update index.html.
    """

    cmd_build()
    cmd_update_index()


# ------------------------------------------------------------
# CLI
# ------------------------------------------------------------

COMMANDS = {
    "new": cmd_new,
    "build": cmd_build,
    "update-index": cmd_update_index,
    "all": cmd_all,
}


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        print("Available commands:")
        for command in COMMANDS:
            print(f"    python build_blog.py {command}")
        sys.exit(1)

    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()