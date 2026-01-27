#!/usr/bin/env python3
"""
Advanced Article Generator Script
Automatically generates HTML article files from articles-data.json with content support
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path
import markdown
from typing import Dict, List, Optional

class ArticleGenerator:
    def __init__(self, template_path: str, data_path: str, output_dir: str):
        self.template_path = template_path
        self.data_path = data_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def load_template(self) -> str:
        """Load the article template"""
        with open(self.template_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def load_articles_data(self) -> Dict:
        """Load the articles data from JSON"""
        with open(self.data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def replace_placeholders(self, template: str, article_data: Dict) -> str:
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
    
    def generate_article_content(self, article_data: Dict, articles_data: Dict) -> str:
        """Generate the article content HTML"""
        
        # Check if article has content field
        if 'content' in article_data and article_data['content']:
            # If content is in Markdown, convert to HTML
            if article_data.get('contentFormat') == 'markdown':
                content_html = markdown.markdown(article_data['content'])
            else:
                content_html = article_data['content']
        else:
            # Generate placeholder content
            content_html = self.generate_placeholder_content(article_data)
        
        # Add article body (no duplicate header since template already has it)
        body_html = f"""
        <div class="article-body">
            {content_html}
        </div>
        """
        
        return body_html
    
    def generate_placeholder_content(self, article_data: Dict) -> str:
        """Generate placeholder content when no content is provided"""
        return f"""
        <div class="article-placeholder">
            <h2>Article Coming Soon</h2>
            <p>We're currently writing the full content for: <strong>{article_data['title']}</strong></p>
            <p>This article will cover: {article_data['description']}</p>
            
            <div class="placeholder-cta">
                <h3>Need Help Now?</h3>
                <p>While we finish this article, our AI agents can help you with your medical billing questions right away.</p>
                <a href="/#get-started" class="btn-primary">Ask Our AI Agent</a>
            </div>
        </div>
        """
    
    def generate_related_articles(self, article_data: Dict, articles_data: Dict) -> str:
        """Generate related articles section"""
        related_html = """
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
                                    related_html += f"""
                <article class="related-article">
                    <h4><a href="/resources/{related_article['id']}.html">{related_article['title']}</a></h4>
                    <p>{related_article['description'][:100]}...</p>
                    <div class="related-article-meta">
                        <span class="category">{related_article['category']}</span>
                        <span class="read-time">{related_article['readTime']}</span>
                    </div>
                </article>
                """
        
        related_html += """
                </div>
            </div>
        </footer>
        """
        
        return related_html
    
    def validate_article_data(self, article: Dict) -> List[str]:
        """Validate article data and return list of errors"""
        errors = []
        required_fields = ['id', 'title', 'description', 'category', 'tags', 'publishDate', 'readTime', 'author']
        
        for field in required_fields:
            if field not in article:
                errors.append(f"Missing required field: {field}")
            elif not article[field]:
                errors.append(f"Empty required field: {field}")
        
        # Validate ID format
        if 'id' in article and not re.match(r'^[a-z0-9-]+$', article['id']):
            errors.append("Article ID must contain only lowercase letters, numbers, and hyphens")
        
        return errors
    
    def generate_articles(self):
        """Main function to generate all articles"""
        try:
            # Load template and data
            template = self.load_template()
            articles_data = self.load_articles_data()
            
            print(f"Generating {len(articles_data['articles'])} articles...")
            
            errors = []
            
            for article in articles_data['articles']:
                print(f"Processing: {article['id']}")
                
                # Validate article data
                article_errors = self.validate_article_data(article)
                if article_errors:
                    errors.extend([f"{article['id']}: {error}" for error in article_errors])
                    continue
                
                try:
                    # Replace placeholders in template
                    article_html = self.replace_placeholders(template, article)
                    
                    # Generate article content
                    article_content = self.generate_article_content(article, articles_data)
                    
                    # Replace the content placeholder in the template
                    article_html = article_html.replace('<!-- ARTICLE_CONTENT_PLACEHOLDER -->', article_content)
                    
                    # Write the generated file
                    output_file = self.output_dir / f"{article['id']}.html"
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(article_html)
                    
                    print(f"✓ Generated: {output_file}")
                    
                except Exception as e:
                    errors.append(f"{article['id']}: Generation failed - {str(e)}")
            
            if errors:
                print("\n⚠️  Errors encountered:")
                for error in errors:
                    print(f"  - {error}")
            else:
                print("\n✅ All articles generated successfully!")
                
        except Exception as e:
            print(f"❌ Fatal error: {str(e)}")

def main():
    """Main entry point"""
    generator = ArticleGenerator(
        template_path='public/article-template.html',
        data_path='public/articles-data.json',
        output_dir='public/resources'
    )
    
    generator.generate_articles()

if __name__ == "__main__":
    main() 