#!/bin/bash
# Script de pruebas con cURL - Simple y rápido

echo "🧪 TESTING API HÍBRIDA CON cURL"
echo "================================"

BASE_URL="http://localhost:3000/api/chat"
UUID1="550e8400-e29b-41d4-a716-446655440000"
UUID2="550e8400-e29b-41d4-a716-446655440001"

# Test 1: Chat Simple (dolphin-mistral)
echo -e "\n🤖 TEST 1: Chat Simple"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cuéntame un chiste corto sobre programadores",
    "conversationId": "'$UUID1'"
  }' | jq '.'

sleep 2

# Test 2: Chat con Memoria (gpt-oss-20b)
echo -e "\n🧠 TEST 2: Estableciendo memoria"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Mi nombre es Carlos y soy desarrollador de React",
    "conversationId": "'$UUID2'",
    "modelType": "memory",
    "useMemory": true
  }' | jq '.'

sleep 2

echo -e "\n🧠 TEST 2b: Probando memoria"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "¿Recuerdas mi nombre y tecnología favorita?",
    "conversationId": "'$UUID2'",
    "modelType": "memory", 
    "useMemory": true
  }' | jq '.'

sleep 2

# Test 3: Chat con Conocimiento (gpt-oss-20b)
echo -e "\n📚 TEST 3: Aprendiendo conocimiento"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Aprende esto: Next.js 14 incluye App Router que mejora el rendimiento significativamente",
    "conversationId": "'$UUID1'",
    "modelType": "with_tools",
    "useKnowledgeBase": true
  }' | jq '.'

sleep 2

# Test 4: Híbrido completo
echo -e "\n🎯 TEST 4: Híbrido (Memoria + Conocimiento)"
curl -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Basándote en lo que sabes de Next.js y recordando mi perfil, ¿qué me recomiendas?",
    "conversationId": "'$UUID2'",
    "modelType": "with_tools",
    "useMemory": true,
    "useKnowledgeBase": true
  }' | jq '.'

echo -e "\n✅ TESTS COMPLETADOS"