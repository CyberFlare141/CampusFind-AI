# Visual Search

Visual Search lets signed-in users upload a JPG, PNG, or WebP photo (maximum 5 MB) and discover available found-item reports with visually similar images. It returns possible matches; similarity is not proof of ownership.

## Pipeline and storage

The backend validates the upload, sends its bytes to the configured multimodal embedding provider, and compares the resulting vector with embeddings for available found-report images. Similarity is cosine similarity, displayed as a bounded percentage. The provider abstraction is `IVisualEmbeddingProvider`; the current adapter is Gemini `gemini-embedding-2`. Vectors are JSON in the SQL Server `VisualEmbeddings` table, keyed by image and model. Existing reports are indexed lazily at search time, and each image/model pair is stored once. Change the embedding model only with a reindex because model vector spaces are incompatible.

Found-item image additions are indexed on first search; report images continue to use the existing `/uploads/reports/` storage. Azure App Service must use the deployment's persistent/shared image storage for this existing path if files need to survive instance replacement or scale-out.

## Configuration

Non-secret values are in `appsettings.json` under `VisualSearch`: `Provider`, `Model`, `SimilarityThreshold`, and `MaxResults`. Keep `Gemini:ApiKey` out of source control and set it as an Azure App Service setting or environment variable `Gemini__ApiKey`. The existing Gemini key is reused. The authenticated endpoint is `POST /api/visual-search` with multipart field `image`.

Run the API's EF Core migration before using the endpoint. To index historical items, search will populate vectors as users encounter unindexed photos. Failures for individual old images are logged and skipped; provider errors on query images return a friendly temporary-unavailable response. Check server logs and the configured Gemini API key/model when troubleshooting.
