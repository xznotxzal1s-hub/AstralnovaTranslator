import unittest

from app.utils.translation import split_text_into_chunks


class TranslationChunkingTests(unittest.TestCase):
    def test_short_text_under_chunk_size_stays_single_chunk(self) -> None:
        chunks = split_text_into_chunks("短い文章です。", 100)

        self.assertEqual(chunks, ["短い文章です。"])

    def test_paragraphs_are_preferred_as_split_boundaries(self) -> None:
        text = "第一段落です。ここは短いです。\n\n第二段落です。ここも短いです。"

        chunks = split_text_into_chunks(text, 24)

        self.assertEqual(chunks, ["第一段落です。ここは短いです。", "第二段落です。ここも短いです。"])

    def test_long_japanese_dialogue_splits_after_closing_quote(self) -> None:
        text = "「これは長い会話です。まだ続きます！」彼女は笑った。「次の言葉も別の文です。」"

        chunks = split_text_into_chunks(text, 24)

        self.assertEqual(chunks[0], "「これは長い会話です。まだ続きます！」")
        self.assertTrue(all(len(chunk) <= 24 for chunk in chunks))
        self.assertEqual("".join(chunks), text)

    def test_ellipsis_is_treated_as_a_sentence_boundary(self) -> None:
        text = "彼は黙った……それから小さく笑った。次の瞬間、扉が開いた。"

        chunks = split_text_into_chunks(text, 14)

        self.assertEqual(chunks[0], "彼は黙った……")
        self.assertTrue(all(len(chunk) <= 14 for chunk in chunks))
        self.assertEqual("".join(chunks), text)

    def test_very_long_sentence_falls_back_to_hard_split(self) -> None:
        text = "あ" * 125

        chunks = split_text_into_chunks(text, 50)

        self.assertEqual([len(chunk) for chunk in chunks], [50, 50, 25])
        self.assertEqual("".join(chunks), text)

    def test_no_empty_chunks_are_returned(self) -> None:
        text = "\n\n第一文です。\n\n\n第二文です。\n\n"

        chunks = split_text_into_chunks(text, 8)

        self.assertTrue(chunks)
        self.assertTrue(all(chunk.strip() for chunk in chunks))


if __name__ == "__main__":
    unittest.main()
