FROM python:3.11-slim

WORKDIR /app

COPY ml/requirements.txt /app/ml/requirements.txt
RUN pip install --no-cache-dir -r ml/requirements.txt

COPY ml/ /app/ml/
COPY data/ /app/data/

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "ml.inference.server:app", "--host", "0.0.0.0", "--port", "8001"]
