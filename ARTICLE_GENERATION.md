# Article Generation Automation

This document explains how the automated article generation system works and how to use it.

## What is Automated Content Generation?

Instead of manually creating HTML files for each article, the automation system:

1. **Reads article data** from `public/articles-data.json`
2. **Uses a template** (`public/article-template.html`) 
3. **Automatically generates** individual HTML files for each article
4. **Ensures consistency** between metadata and content

## Benefits

- ✅ **No manual HTML creation** - just update JSON data
- ✅ **Consistent formatting** - all articles use the same template
- ✅ **Error prevention** - validation catches missing data
- ✅ **Easy updates** - change template once, affects all articles
- ✅ **SEO optimization** - automatic meta tags and structured data

## How to Use

### 1. Add a New Article

Edit `public/articles-data.json` and add a new article object:

```json
{
  "id": "your-article-id",
  "title": "Your Article Title",
  "description": "Brief description of the article",
  "category": "Medical Billing",
  "tags": ["tag1", "tag2", "tag3"],
  "publishDate": "2025-01-20",
  "readTime": "5 min read",
  "author": "MyCareClaim Team",
  "relatedArticles": ["related-article-1", "related-article-2"],
  "content": "<p>Your article content in HTML</p>",
  "contentFormat": "html"
}
```

### 2. Generate Articles

Run the generation script:

```bash
# Using npm script (recommended)
npm run generate-articles

# Or directly with Python
python generate_articles_advanced.py
```

### 3. Deploy

```bash
# Build and deploy
npm run build

# Or just deploy
npm run deploy
```

## Article Data Structure

### Required Fields

- `id`: Unique identifier (lowercase, hyphens only)
- `title`: Article title
- `description`: Brief description
- `category`: Article category
- `tags`: Array of tags
- `publishDate`: Publication date (YYYY-MM-DD)
- `readTime`: Estimated reading time
- `author`: Author name

### Optional Fields

- `content`: Article content (HTML or Markdown)
- `contentFormat`: "html" or "markdown"
- `lastUpdated`: Last update date
- `relatedArticles`: Array of related article IDs

## Content Formats

### HTML Content

```json
{
  "content": "<h2>Introduction</h2><p>Your content here...</p>",
  "contentFormat": "html"
}
```

### Markdown Content

```json
{
  "content": "# Introduction\n\nYour content here...",
  "contentFormat": "markdown"
}
```

### No Content (Placeholder)

If no `content` field is provided, a placeholder will be generated automatically.

## Validation

The system validates:

- ✅ All required fields are present
- ✅ Article IDs follow naming conventions
- ✅ Related articles exist
- ✅ Dates are in correct format

## File Structure

```
public/
├── articles-data.json          # Article metadata and content
├── article-template.html       # HTML template
├── resources/                  # Generated article files
│   ├── article-1.html
│   ├── article-2.html
│   └── ...
└── resources.html              # Resources landing page
```

## Workflow

1. **Edit JSON**: Update `articles-data.json` with new articles
2. **Generate**: Run `npm run generate-articles`
3. **Test**: Check generated files locally
4. **Deploy**: Run `npm run deploy`

## Troubleshooting

### Common Errors

- **Missing required field**: Add the missing field to your article data
- **Invalid ID format**: Use only lowercase letters, numbers, and hyphens
- **Related article not found**: Ensure the related article ID exists in the JSON

### Validation

Run validation to check for issues:

```bash
npm run validate-articles
```

## Advanced Features

### Custom Templates

You can modify `public/article-template.html` to change the layout of all articles.

### Content Processing

The system supports:
- HTML content
- Markdown content (with conversion)
- Automatic related articles
- SEO meta tags
- Structured data

### Build Integration

The generation process is integrated into the build pipeline:

```bash
npm run build  # Generates articles + deploys
```

## Migration from Manual Process

If you have existing manually created articles:

1. Extract the content and metadata
2. Add to `articles-data.json`
3. Run the generation script
4. Replace manual files with generated ones

This ensures consistency and makes future updates much easier. 