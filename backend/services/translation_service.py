from deep_translator import GoogleTranslator

def translate_text_to_hindi(text: str) -> str:
    """
    Translate English text to Hindi using Google Translator
    """
    try:
        hindi_text = GoogleTranslator(
            source="auto",
            target="hi"
        ).translate(text)
        return hindi_text
    except Exception as e:
        raise RuntimeError(f"Translation failed: {e}")

def translate_topics_to_hindi(topics: list) -> list:
    """
    Translate a list of topics to Hindi
    Each topic has 'topic' and 'content' fields
    Returns topics with added 'topic_hindi' and 'content_hindi' fields
    """
    translated_topics = []
    
    for topic in topics:
        try:
            topic_hindi = translate_text_to_hindi(topic.get('topic', ''))
            content_hindi = translate_text_to_hindi(topic.get('content', ''))
            
            translated_topics.append({
                **topic,
                'topic_hindi': topic_hindi,
                'content_hindi': content_hindi
            })
        except Exception as e:
            # If translation fails, keep original and mark error
            translated_topics.append({
                **topic,
                'topic_hindi': topic.get('topic', ''),
                'content_hindi': topic.get('content', ''),
                'translation_error': str(e)
            })
    
    return translated_topics