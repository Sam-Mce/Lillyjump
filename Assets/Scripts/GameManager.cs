using UnityEngine;
using UnityEngine.UI;
using TMPro;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private TextMeshProUGUI scoreText;
    [SerializeField] private TextMeshProUGUI highScoreText;
    [SerializeField] private GameObject gameOverPanel;
    [SerializeField] private Button restartButton;
    
    [Header("Game References")]
    [SerializeField] private FrogController frogController;
    [SerializeField] private LilypadManager lilypadManager;
    [SerializeField] private Camera mainCamera;
    
    private int currentScore;
    private int highScore;
    private bool isGameOver;
    
    private void Start()
    {
        highScore = PlayerPrefs.GetInt("HighScore", 0);
        UpdateHighScoreUI();
        
        if (restartButton != null)
        {
            restartButton.onClick.AddListener(RestartGame);
        }
        
        gameOverPanel.SetActive(false);
        isGameOver = false;
    }
    
    public void IncrementScore()
    {
        if (!isGameOver)
        {
            currentScore++;
            UpdateScoreUI();
            lilypadManager.IncrementScore();
        }
    }
    
    public void GameOver()
    {
        isGameOver = true;
        gameOverPanel.SetActive(true);
        
        if (currentScore > highScore)
        {
            highScore = currentScore;
            PlayerPrefs.SetInt("HighScore", highScore);
            UpdateHighScoreUI();
        }
    }
    
    private void RestartGame()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
    }
    
    private void UpdateScoreUI()
    {
        if (scoreText != null)
        {
            scoreText.text = $"Score: {currentScore}";
        }
    }
    
    private void UpdateHighScoreUI()
    {
        if (highScoreText != null)
        {
            highScoreText.text = $"High Score: {highScore}";
        }
    }
    
    public void ResetGame()
    {
        currentScore = 0;
        UpdateScoreUI();
        lilypadManager.ResetGame();
        gameOverPanel.SetActive(false);
        isGameOver = false;
    }
} 