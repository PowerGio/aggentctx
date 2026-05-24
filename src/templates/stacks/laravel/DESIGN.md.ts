export const template = `# DESIGN.md — {{project.name}}

> Architecture and patterns reference for this Laravel project.

## Architecture

**Stack:** Laravel / PHP
**Pattern:** MVC — Route → Controller → Service → Model

\`\`\`
app/
  Http/
    Controllers/    # Thin request handlers — delegate to Services
    Requests/       # Form Request classes for validation
    Middleware/     # HTTP middleware
  Models/           # Eloquent models
  Services/         # Business logic (create if not present)
  Providers/        # Service providers — bootstrapping
routes/
  web.php           # Web routes (session, CSRF)
  api.php           # API routes (stateless)
database/
  migrations/       # Schema migrations
  seeders/          # Seed data
  factories/        # Model factories for tests
resources/
  views/            # Blade templates
\`\`\`

## Eloquent Patterns

\`\`\`php
// Always define fillable
class Article extends Model
{
    protected $fillable = ['title', 'body', 'user_id'];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    // Relationships
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

// Prevent N+1 — always eager load
$articles = Article::with('author', 'tags')->latest()->paginate(20);
\`\`\`

## Route Patterns

\`\`\`php
// Named routes, grouped by middleware
Route::middleware(['auth'])->prefix('dashboard')->group(function () {
    Route::resource('articles', ArticleController::class)->names('dashboard.articles');
});
\`\`\`

## Validation Pattern

\`\`\`php
// Use Form Requests for non-trivial validation
class StoreArticleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'body'  => ['required', 'string'],
        ];
    }
}
\`\`\`

## Patterns

- **Config access:** always use \`config('app.key')\` in code — never \`env()\` directly
- **Jobs:** use \`Queue::push()\` for any operation > 200ms
- **Events:** prefer events + listeners over direct calls for cross-module side effects
- **Testing:** use \`RefreshDatabase\` trait + factories for feature tests

## Directory Structure

{{#if structure.sourceDir}}- \`{{structure.sourceDir}}/\` — source code{{/if}}
{{#if structure.testDir}}- \`{{structure.testDir}}/\` — tests{{/if}}
`;
