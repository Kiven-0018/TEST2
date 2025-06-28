# adaptive_generator.py
"""
Adaptive Prompt Generation Module for VARK-based Tutoring Chatbot
Integrates comprehensive prompt templates with database-driven learning styles
"""

from prompt_templates import PROMPT_TEMPLATES
import logging

# Configure logging for debugging and user type tracking
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


class AdaptivePromptGenerator:
    """
    Core module for generating adaptive prompts based on VARK learning styles
    """

    def __init__(self):
        self.templates = PROMPT_TEMPLATES
        self.default_style = "Read/Write"  # Fallback style as per PRD requirements

        # Style normalization mapping for database consistency
        self.style_normalization = {
            "visual": "Visual",
            "aural": "Auditory",
            "auditory": "Auditory",
            "readwrite": "Read/Write",
            "read/write": "Read/Write",
            "kinesthetic": "Kinesthetic",
            "V": "Visual",
            "A": "Auditory",
            "R": "Read/Write",
            "K": "Kinesthetic",
        }

    def normalize_style(self, user_style):
        """
        Normalize learning style input to match template keys
        Handles database values and various input formats
        """
        if not user_style:
            return self.default_style

        # Convert to string and normalize case
        style_str = str(user_style).strip()

        # Direct lookup in normalization map
        normalized = self.style_normalization.get(style_str.lower())
        if normalized:
            return normalized

        # Check if it's already a valid template key
        if style_str in self.templates:
            return style_str

        # Fallback to default
        logging.warning(
            f"Unknown learning style '{user_style}', using default: {self.default_style}"
        )
        return self.default_style

    def generate_adaptive_prompt(self, user_query, user_style, user_id=None):
        """
        Core function: Generate adaptive prompt based on user query and learning style

        Args:
            user_query (str): The student's math question/problem
            user_style (str): The user's VARK learning style
            user_id (int, optional): User ID for debugging/logging

        Returns:
            str: Fully formatted prompt ready for LLM API
        """

        # Normalize the learning style
        normalized_style = self.normalize_style(user_style)

        # Log user type for debugging (as requested)
        if user_id:
            logging.info(
                f"USER TYPE DEBUG | User ID: {user_id} | Learning Style: {normalized_style} | Query: {user_query[:50]}..."
            )
        else:
            logging.info(
                f"USER TYPE DEBUG | Learning Style: {normalized_style} | Query: {user_query[:50]}..."
            )

        # Get appropriate template with fallback safety
        template = self.templates.get(
            normalized_style, self.templates[self.default_style]
        )

        # Generate the final prompt by inserting user query
        try:
            final_prompt = template.format(user_query=user_query)

            # Log successful generation
            logging.info(
                f"✅ Adaptive prompt generated successfully for {normalized_style} learner"
            )

            return final_prompt

        except Exception as e:
            # Fallback error handling
            logging.error(f"❌ Error generating prompt: {e}")
            fallback_template = self.templates[self.default_style]
            return fallback_template.format(user_query=user_query)

    def get_available_styles(self):
        """
        Return list of available learning styles
        """
        return list(self.templates.keys())

    def get_style_info(self, style):
        """
        Get information about a specific learning style template
        """
        normalized_style = self.normalize_style(style)
        template = self.templates.get(normalized_style)

        if template:
            # Extract key characteristics from template
            lines = template.split("\n")
            instructions = [
                line.strip()
                for line in lines
                if line.strip().startswith(("1.", "2.", "3.", "4."))
            ]

            return {
                "style": normalized_style,
                "available": True,
                "instructions_count": len(instructions),
                "sample_instructions": instructions[:2] if instructions else [],
            }

        return {
            "style": style,
            "available": False,
            "message": f"Style not found, would default to {self.default_style}",
        }


# Global instance for easy import
adaptive_generator = AdaptivePromptGenerator()


# Convenience function for direct usage (maintains compatibility with existing code)
def generate_adaptive_prompt(user_query, user_style, user_id=None):
    """
    Convenience function for generating adaptive prompts
    Compatible with existing app.py structure
    """
    return adaptive_generator.generate_adaptive_prompt(user_query, user_style, user_id)


# Debug function for development
def debug_all_styles(sample_query="2x - 5 = 11"):
    """
    Generate prompts for all VARK styles with a sample query
    Useful for testing and debugging
    """
    print("🔍 DEBUGGING ALL LEARNING STYLES")
    print("=" * 50)

    for style in adaptive_generator.get_available_styles():
        print(f"\n📚 STYLE: {style}")
        print("-" * 30)
        prompt = adaptive_generator.generate_adaptive_prompt(sample_query, style)
        print(f"Generated Prompt Length: {len(prompt)} characters")
        print(f"Preview: {prompt[:200]}...")
        print()


if __name__ == "__main__":
    # Test the module when run directly
    debug_all_styles()
