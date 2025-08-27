#!/bin/bash
set -e
psql -U carduser -d carddb -f /app/init.sql
