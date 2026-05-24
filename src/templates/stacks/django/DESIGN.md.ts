export const template = `# DESIGN.md — {{project.name}}

> Architecture and patterns reference for this Django project.

## Architecture

**Stack:** Django / Python
**Pattern:** MVT — Model → View → Template (or Serializer if DRF)

\`\`\`
manage.py
<project>/
  settings.py      # Config — split into base/dev/prod if large
  urls.py          # Root URL dispatcher
<app>/
  models.py        # ORM models — source of truth for data shape
  views.py         # Request handlers (CBV or FBV)
  urls.py          # App-level URL patterns
  serializers.py   # DRF request/response schemas (if present)
  admin.py         # Admin interface registration
  tests.py         # Tests — or tests/ package
  migrations/      # Auto-generated schema migrations
\`\`\`

## ORM Patterns

\`\`\`python
# Always define ordering and verbose names
class Article(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="articles")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "articles"

# Prevent N+1 — always use select_related / prefetch_related
articles = Article.objects.select_related("author").prefetch_related("tags").all()
\`\`\`

## URL Patterns

\`\`\`python
# Always use named patterns
path("articles/<int:pk>/", ArticleDetailView.as_view(), name="article-detail"),
\`\`\`

## View Patterns

\`\`\`python
# CBV — preferred for CRUD
class ArticleDetailView(LoginRequiredMixin, DetailView):
    model = Article
    template_name = "articles/detail.html"

# DRF ViewSet — for APIs
class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.select_related("author")
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticated]
\`\`\`

## Patterns

- **Settings:** split into \`settings/base.py\`, \`settings/dev.py\`, \`settings/prod.py\` for non-trivial projects
- **Secrets:** \`os.environ\` or \`django-environ\` — never hardcode in settings
- **Migrations:** always review generated SQL before committing (\`sqlmigrate <app> <N>\`)
- **Admin:** register all models in \`admin.py\` with \`list_display\` for usability

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — tests{{/if}}
`;
