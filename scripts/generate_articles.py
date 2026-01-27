#!/usr/bin/env python3
"""
Article Generator Script
Automatically generates HTML article files from articles-data.json
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

def load_template(template_path):
    """Load the article template"""
    with open(template_path, 'r', encoding='utf-8') as f:
        return f.read()

def load_articles_data(data_path):
    """Load the articles data from JSON"""
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def replace_placeholders(template, article_data):
    """Replace all placeholders in the template with article data"""
    replacements = {
        'ARTICLE_TITLE': article_data['title'],
        'ARTICLE_DESCRIPTION': article_data['description'],
        'ARTICLE_TAGS': ', '.join(article_data['tags']),
        'ARTICLE_ID': article_data['id'],
        'ARTICLE_PUBLISH_DATE': article_data['publishDate'],
        'ARTICLE_LAST_UPDATED': article_data.get('lastUpdated', article_data['publishDate']),
        'ARTICLE_CATEGORY': article_data['category'],
        'ARTICLE_READ_TIME': article_data['readTime'],
        'ARTICLE_AUTHOR': article_data['author']
    }
    
    # Replace all placeholders
    for placeholder, value in replacements.items():
        template = template.replace(placeholder, str(value))
    
    return template

def generate_article_content(article_data, articles_data):
    """Generate the article content HTML"""
    # This would be where you'd generate the actual article content
    # For now, we'll create a placeholder content structure
    
    content_html = f"""
    <header class="article-header">
        <div class="article-meta">
            <span class="article-category">{article_data['category']}</span>
            <span class="article-read-time">{article_data['readTime']}</span>
            <span class="article-date">{article_data['publishDate']}</span>
        </div>
        <h1 class="article-title">{article_data['title']}</h1>
        <p class="article-description">{article_data['description']}</p>
        <div class="article-tags">
            {''.join([f'<span class="tag">{tag}</span>' for tag in article_data['tags']])}
        </div>
    </header>
    
    <div class="article-body">
        <p>This is the content for: {article_data['title']}</p>
        <p>Article ID: {article_data['id']}</p>
        <p>Category: {article_data['category']}</p>
        <p>Published: {article_data['publishDate']}</p>
    </div>
    
    <footer class="article-footer">
        <div class="related-articles">
            <h3>Related Articles</h3>
            <div class="related-articles-grid">
    """
    
    # Add related articles
    if 'relatedArticles' in article_data:
        for related_id in article_data['relatedArticles']:
            related_article = next((a for a in articles_data['articles'] if a['id'] == related_id), None)
            if related_article:
                content_html += f"""
                <article class="related-article">
                    <h4><a href="/resources/{related_article['id']}/">{related_article['title']}</a></h4>
                    <p>{related_article['description'][:100]}...</p>
                </article>
                """
    
    content_html += """
            </div>
        </div>
    </footer>
    """
    
    return content_html

def generate_articles():
    """Main function to generate all articles"""
    # File paths
    template_path = 'public/article-template.html'
    data_path = 'public/articles-data.json'
    output_dir = Path('public/resources')
    
    # Ensure output directory exists
    output_dir.mkdir(exist_ok=True)
    
    # Load template and data
    template = load_template(template_path)
    articles_data = load_articles_data(data_path)
    
    print(f"Generating {len(articles_data['articles'])} articles...")
    
    for article in articles_data['articles']:
        print(f"Generating: {article['id']}")
        
        # Replace placeholders in template
        article_html = replace_placeholders(template, article)
        
        # Generate article content
        article_content = generate_article_content(article, articles_data)
        
        # Replace the content placeholder in the template
        article_html = article_html.replace('<!-- ARTICLE_CONTENT_PLACEHOLDER -->', article_content)
        
        # Write the generated file
        output_file = output_dir / f"{article['id']}.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(article_html)
        
        print(f"✓ Generated: {output_file}")
    
    print("Article generation complete!")

if __name__ == "__main__":
    generate_articles() 