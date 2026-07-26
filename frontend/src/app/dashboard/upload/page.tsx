"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { ApiError, api, type Dataset } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatDate } from "@/lib/utils";

export default function UploadPage() {
  const { token, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDatasets = useCallback(async () => {
    if (!token) return;
    const data = await api.listDatasets(token);
    setDatasets(data.datasets);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .listDatasets(token)
      .then((data) => {
        if (active) setDatasets(data.datasets);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : "Failed to load datasets.");
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleUpload(file: File) {
    if (!token) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    try {
      const result = await api.uploadDataset(token, file);
      setMessage(result.message);
      await loadDatasets();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSample() {
    if (!token) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const result = await api.loadSampleDataset(token);
      setMessage(`${result.message} Suggested query: ${result.suggested_query}`);
      await loadDatasets();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sample dataset.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await api.deleteDataset(token, id);
      await loadDatasets();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed.");
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload dataset</h1>
          <p className="mt-2 text-muted-foreground">
            Add CSV files to your workspace for AI-powered analysis.
          </p>
        </div>
        <Button variant="outline" disabled={uploading} onClick={() => void handleSample()}>
          <Sparkles className="h-4 w-4" />
          Load sample dataset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drag and drop your CSV</CardTitle>
          <CardDescription>
            Supported format: CSV up to 10 MB. Click anywhere in the dropzone to browse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200 ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50"
            }`}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>
            <p className="text-lg font-medium">Drop your CSV here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              or choose a file from your computer
            </p>
            <div className="mt-6">
              <Button type="button" disabled={uploading}>
                <FileUp className="h-4 w-4" />
                Browse files
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />
          </div>

          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your datasets</CardTitle>
          <CardDescription>All uploaded files in your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {datasets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No datasets uploaded yet. Load the sample sales CSV to start a demo.
            </p>
          ) : (
            datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="glass-tile flex flex-col gap-3 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{dataset.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {dataset.row_count} rows · {dataset.column_count} columns ·{" "}
                    {formatBytes(dataset.size_bytes)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dataset.columns.slice(0, 5).map((column) => (
                      <Badge key={column} variant="muted">
                        {column}
                      </Badge>
                    ))}
                    {dataset.columns.length > 5 ? (
                      <Badge variant="muted">+{dataset.columns.length - 5} more</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{formatDate(dataset.created_at)}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${dataset.filename}`}
                    onClick={() => void handleDelete(dataset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
